/**
 * AI Prompts for Talent Matching and Career Analysis
 * 
 * This file contains the system prompts used to guide the LLM in various 
 * tasks including skill extraction, CV analysis, and job ranking.
 */

/**
 * Prompt: Extract Technical Skills from CV
 * 
 * Target: Converts unstructured CV text into a clean list of technical proficiencies.
 * Usage: Triggered during candidate profile creation or CV updates.
 */
export const EXTRACT_CV_SKILLS_PROMPT = `
You are an expert technical recruiter. 
Extract all technical skills, programming languages, frameworks, tools, and certifications from the provided CV text.

CV Text:
{cvText}

STRICT RULES:
- Return ONLY a valid JSON array of strings.
- Normalize names (e.g., "NodeJS" -> "Node.js", "React JS" -> "React").
- Do NOT include soft skills (e.g., "Leadership", "Teamwork").
- Do NOT include explanations or markdown.

Example Output:
["Python", "Django", "PostgreSQL", "AWS", "Docker", "REST API"]
`;

/**
 * Prompt: Comprehensive CV vs Job Description Analysis
 * 
 * Target: Provides a multi-dimensional evaluation of a candidate for a specific role.
 * Output: Includes a match score, constructive suggestions, and a tailored cover letter.
 * Usage: Used in the detailed "Application Insight" section for candidates.
 */
export const COMPREHENSIVE_ANALYSIS_PROMPT = `
You are a career growth specialist and a strict hiring manager.
Compare the Candidate's CV with the Job Description and provide a holistic evaluation.

Job Description:
{jobDescription}

Candidate Name:
{candidateName}

Candidate CV:
{cvText}

YOUR TASK:
1. **Overall Match Score**: Calculate a score from 0 to 100. 
   Consider: Technical alignment (60%), Experience relevance (20%), and Career progression (20%). 
   Be realistic and strict.
2. **Improvement Suggestions**: Provide 3-5 specific, actionable points on how the candidate can improve their profile or CV specifically for THIS role. 
   Keep suggestions professional and constructive.
3. **Cover Letter**: Write a high-impact, professional cover letter (approx. 150-200 words, 3 short paragraphs) that effectively sells this candidate's existing strengths to the hiring manager. 
   - **MANDATORY**: Begin the letter with the exact greeting "Dear HR Manager,".
   - **MANDATORY**: Mention the specific Company Name and Job Title from the Job Description in the first paragraph.
   - **MANDATORY**: End the letter with the closing phrase "Best regards," followed by the candidate full name exactly as shown in the Candidate Name field.
   - **MANDATORY**: Do NOT use the word "Candidate" as the closing signature.
   - Do NOT hallucinate skills the candidate does not have.

Return ONLY a valid JSON object with this structure:
{
  "overallScore": number,
  "suggestions": string[],
  "coverLetter": string
}

STRICT RULES:
- Output MUST be valid JSON.
- No markdown formatting (\`\`\`json).
- suggestions must be a flat array of strings.
`;

/**
 * Prompt: Extract Job Description Keywords
 * 
 * Target: Identifies core technical requirements from a job posting.
 * Usage: Enables efficient client-side filtering and initial match scoring.
 */
export const EXTRACT_JD_KEYWORDS_PROMPT = `
Extract core technical requirements from this Job Description.

Job Description:
{jobDescription}

Return ONLY a valid JSON array of strings.
Example: ["Java", "Spring Boot", "MySQL"]
`;

/**
 * Prompt: Batch Job Ranking
 * 
 * Target: Evaluates a list of job postings against a single candidate profile in one operation.
 * Usage: Powers the "Recommended Jobs" dashboard feature with high accuracy.
 */
export const RANK_JOBS_PROMPT = `
You are an advanced talent matching system. 
Analyze the candidate's profile against the provided list of job posts.

CANDIDATE PROFILE:
{candidateProfile}

JOB POSTS:
{jobsList}

YOUR TASK:
For each job in the list, calculate a match percentage (0-100).
Consider:
1. **Title & Experience Match**: How well does the candidate's profile/CV align with the job title and seniority?
2. **Skill Match**: Do the candidate's skills and the technical content in their CV match the required skills?
3. **Relevance**: Is the candidate's background suitable for this specific role?

STRICT RULES:
- If "cvContent" is provided, use it as the primary source of truth for skills and experience.

Return ONLY a valid JSON array of objects with "id" and "matchPercent".
Example Output:
[
  { "id": "uuid-1", "matchPercent": 95 },
  { "id": "uuid-2", "matchPercent": 40 }
]

STRICT RULES:
- Return ONLY the JSON array. No markdown, no explanations.
- Be realistic—only give >80% if it's a very strong match.
`;
