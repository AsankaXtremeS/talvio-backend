import { env } from "../../config/env";

export type ProviderType = "gemini" | "openai";

export interface ProviderConfig {
  name: string;
  type: ProviderType;
  baseURL?: string;
  apiKey?: string;
  model: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    name: "groq",
    type: "openai",
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: env.GROQ_API_KEY,
    model: "llama-3.3-70b-versatile",
  },
  {
    name: "mistral",
    type: "openai",
    baseURL: "https://api.mistral.ai/v1",
    apiKey: env.MISTRAL_API_KEY,
    model: "mistral-small-latest",
  },
  {
    name: "openrouter",
    type: "openai",
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: env.OPENROUTER_API_KEY,
    model: "meta-llama/llama-3.3-70b-instruct:free",
  },
  {
    name: "gemini",
    type: "gemini",
    model: "gemini-2.5-flash",
    apiKey: env.GEMINI_API_KEY,
  },
];
