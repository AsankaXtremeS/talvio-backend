import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import { PDFParse } from "pdf-parse";
import { env } from "../../config/env";
import { PROVIDERS, ProviderConfig } from "./provider.config";
import {
  COMPREHENSIVE_ANALYSIS_PROMPT,
  EXTRACT_CV_SKILLS_PROMPT,
  EXTRACT_JD_KEYWORDS_PROMPT,
  RANK_JOBS_PROMPT,
} from "./ai.prompts";

/**
 * Configuration Constants
 */
const AI_MODEL_NAME = "gemini-2.5-flash";
const CONCURRENT_AI_LIMIT = 3;
const CV_SLICE_LENGTH = 4000;
const JD_SLICE_LENGTH = 500;
const DEFAULT_TEMP = 0.7;
const LOW_TEMP = 0.1;
const ANALYZE_TEMP = 0.2;

const isGeminiActive = Boolean(env.GEMINI_API_KEY);
const genAiClient = isGeminiActive 
  ? new GoogleGenerativeAI(env.GEMINI_API_KEY) 
  : null;

/**
 * Generative model configured for JSON output
 */
const getGeminiFlashModel = (modelName = AI_MODEL_NAME) => {
  return genAiClient?.getGenerativeModel({
    model: modelName,
    generationConfig: { 
      responseMimeType: "application/json", 
      temperature: LOW_TEMP 
    },
  });
};

/**
 * Cleans raw AI response strings for reliable JSON parsing.
 * Removes markdown blocks and problematic control characters.
 */
const sanitizeJsonResponse = (raw: string): string => {
  try {
    let processed = raw.replace(/```json|```/g, "").trim();
    
    // Remove ASCII control characters (0-31) that break JSON.parse
    processed = processed.replace(/[\x00-\x1F\x7F-\x9F]/g, "");
    
    return processed;
  } catch (err) {
    return raw;
  }
};

/**
 * Simple Semaphore class to manage concurrent AI requests.
 */
class RequestSemaphore {
  private activeCount = 0;
  private readonly waitingQueue: Array<() => void> = [];

  constructor(private readonly maxConcurrent: number) {}

  private async acquire(): Promise<void> {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.waitingQueue.push(resolve));
  }

  private release(): void {
    this.activeCount--;
    const nextTask = this.waitingQueue.shift();
    if (nextTask) {
      this.activeCount++;
      nextTask();
    }
  }

  public async execute<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }
}

const aiRequestQueue = new RequestSemaphore(CONCURRENT_AI_LIMIT);

/**
 * Helper to interact with OpenAI-compatible providers
 */
async function generateWithOpenAi(
  provider: ProviderConfig, 
  prompt: string, 
  temperature = DEFAULT_TEMP
): Promise<string> {
  if (!provider.apiKey || !provider.baseURL) {
    throw new Error(`${provider.name}: Configuration missing`);
  }

  const endpoint = `${provider.baseURL.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      "Authorization": `Bearer ${provider.apiKey}` 
    },
    body: JSON.stringify({
      model: provider.model,
      messages: [{ role: "user", content: prompt }],
      temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`${provider.name} request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload?.choices?.[0]?.message?.content ?? "";
}

/**
 * Executes an AI request with fallback support across multiple providers.
 */
async function executeWithFallback<T>(
  priorityList: string[],
  action: (provider: ProviderConfig) => Promise<T>
): Promise<T> {
  const availableProviders = PROVIDERS.filter(p => 
    priorityList.includes(p.name) && 
    (p.type === "gemini" ? isGeminiActive : !!p.apiKey)
  );

  const errorLogs: string[] = [];

  for (const provider of availableProviders) {
    try {
      return await action(provider);
    } catch (err: any) {
      errorLogs.push(`[${provider.name}] ${err.message}`);
    }
  }

  throw new Error(`AI service failure: ${errorLogs.join(" | ")}`);
}

export interface AnalysisResult {
  overallScore: number;
  suggestions: string[];
  coverLetter: string;
}

/**
 * Core Service for AI-driven logic
 */
export const aiService = {
  /**
   * Extracts text content from a PDF source (URL or local path).
   */
  async extractCvText(sourcePath: string): Promise<string> {
    try {
      let buffer: Buffer;
      
      if (sourcePath.startsWith("http")) {
        const response = await fetch(sourcePath);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
        }
        buffer = Buffer.from(await response.arrayBuffer());
      } else {
        buffer = await fs.promises.readFile(sourcePath);
      }

      const pdfParser = new PDFParse({ data: buffer });
      const result = await pdfParser.getText();
      return (result.text || "").trim().replace(/\0/g, "");
    } catch (err: any) {
      // Re-throw if it's already a formatted error from fetch
      if (err.message.startsWith("Failed to fetch PDF")) {
        throw err;
      }
      console.error("PDF Extraction Failure:", err);
      throw new Error(`Failed to extract text from CV: ${err.message}`);
    }
  },

  /**
   * Extracts professional skills from CV text using AI.
   */
  async extractSkills(content: string): Promise<string[]> {
    const prompt = EXTRACT_CV_SKILLS_PROMPT.replace(
      "{cvText}", 
      content.slice(0, CV_SLICE_LENGTH)
    );

    return aiRequestQueue.execute(() => 
      executeWithFallback(["gemini", "groq", "openrouter"], async (provider) => {
        if (provider.type === "gemini") {
          const modelInstance = getGeminiFlashModel(provider.model);
          const rawResponse = await modelInstance!
            .generateContent(prompt)
            .then(res => res.response.text());
          return JSON.parse(sanitizeJsonResponse(rawResponse));
        }
        const rawResponse = await generateWithOpenAi(provider, prompt, LOW_TEMP);
        return JSON.parse(sanitizeJsonResponse(rawResponse));
      })
    );
  },

  /**
   * Performs a comprehensive analysis of a CV against a job description.
   */
  async analyzeCv(cvText: string, jobDesc: string, candidateName: string = "Candidate"): Promise<AnalysisResult> {
    const prompt = COMPREHENSIVE_ANALYSIS_PROMPT
      .replace("{cvText}", cvText.slice(0, CV_SLICE_LENGTH))
      .replace("{jobDescription}", jobDesc)
      .replace("{candidateName}", candidateName);

    return aiRequestQueue.execute(() => 
      executeWithFallback(["gemini", "mistral", "openrouter"], async (provider) => {
        if (provider.type === "gemini") {
          const modelInstance = getGeminiFlashModel(provider.model);
          const rawResponse = await modelInstance!
            .generateContent(prompt)
            .then(res => res.response.text());
          return JSON.parse(sanitizeJsonResponse(rawResponse));
        }
        const rawResponse = await generateWithOpenAi(provider, prompt, ANALYZE_TEMP);
        return JSON.parse(sanitizeJsonResponse(rawResponse));
      })
    );
  },

  /**
   * Calculates a simple similarity score between two skill sets.
   */
  calculateSimilarity(userSkills: string[], jobSkills: string[]): number {
    if (jobSkills.length === 0) return 0;
    
    const matched = userSkills.filter(skill => 
      jobSkills.some(req => 
        req.toLowerCase().includes(skill.toLowerCase()) || 
        skill.toLowerCase().includes(req.toLowerCase())
      )
    );

    return Math.round((matched.length / jobSkills.length) * 100);
  },

  /**
   * Extracts keywords from a job description.
   */
  async extractJdKeywords(description: string): Promise<string[]> {
    const prompt = EXTRACT_JD_KEYWORDS_PROMPT.replace("{jobDescription}", description);

    return aiRequestQueue.execute(() => 
      executeWithFallback(["gemini", "groq", "openrouter"], async (provider) => {
        if (provider.type === "gemini") {
          const modelInstance = getGeminiFlashModel(provider.model);
          const rawResponse = await modelInstance!
            .generateContent(prompt)
            .then(res => res.response.text());
          return JSON.parse(sanitizeJsonResponse(rawResponse));
        }
        const rawResponse = await generateWithOpenAi(provider, prompt, LOW_TEMP);
        return JSON.parse(sanitizeJsonResponse(rawResponse));
      })
    );
  },

  /**
   * Ranks multiple jobs against a candidate profile using AI.
   */
  async rankJobsWithAI(profile: any, jobs: any[]): Promise<any[]> {
    if (jobs.length === 0) return [];
    
    const simplifiedJobs = jobs.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description?.slice(0, JD_SLICE_LENGTH),
      skillsRequired: job.skillsRequired
    }));

    const prompt = RANK_JOBS_PROMPT
      .replace("{candidateProfile}", JSON.stringify(profile))
      .replace("{jobsList}", JSON.stringify(simplifiedJobs));

    return aiRequestQueue.execute(() => 
      executeWithFallback(["gemini", "groq", "openrouter", "mistral"], async (provider) => {
        if (provider.type === "gemini") {
          const modelInstance = getGeminiFlashModel(provider.model);
          const rawResponse = await modelInstance!
            .generateContent(prompt)
            .then(res => res.response.text());
          return JSON.parse(sanitizeJsonResponse(rawResponse));
        }
        
        const rawResponse = await generateWithOpenAi(provider, prompt, LOW_TEMP);
        return JSON.parse(sanitizeJsonResponse(rawResponse));
      })
    );
  }
};

