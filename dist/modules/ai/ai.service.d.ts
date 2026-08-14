export interface AnalysisResult {
    overallScore: number;
    suggestions: string[];
    coverLetter: string;
}
/**
 * Core Service for AI-driven logic
 */
export declare const aiService: {
    /**
     * Extracts text content from a PDF source (URL or local path).
     */
    extractCvText(sourcePath: string): Promise<string>;
    /**
     * Extracts professional skills from CV text using AI.
     */
    extractSkills(content: string): Promise<string[]>;
    /**
     * Performs a comprehensive analysis of a CV against a job description.
     */
    analyzeCv(cvText: string, jobDesc: string): Promise<AnalysisResult>;
    /**
     * Calculates a simple similarity score between two skill sets.
     */
    calculateSimilarity(userSkills: string[], jobSkills: string[]): number;
    /**
     * Extracts keywords from a job description.
     */
    extractJdKeywords(description: string): Promise<string[]>;
    /**
     * Ranks multiple jobs against a candidate profile using AI.
     */
    rankJobsWithAI(profile: any, jobs: any[]): Promise<any[]>;
};
//# sourceMappingURL=ai.service.d.ts.map