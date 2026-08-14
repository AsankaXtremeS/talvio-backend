import { Request, Response } from "express";
/**
 * GET /api/ai/recommendations
 * Generates personalized job recommendations for the authenticated candidate.
 */
export declare const getRecommendations: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/ai/generate-cover-letter/:jobPostId
 * Generates a tailored cover letter for a specific job post.
 */
export declare const generateCoverLetter: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=ai.controller.d.ts.map