import { Request, Response } from "express";
export declare const getJobPostStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getJobPosts: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getJobPostById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const createJobPost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateJobPost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteJobPost: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * GET /api/employer/job-posts/:id/applications?status=PENDING
 * Returns all candidates who applied for a specific job post.
 * Optionally filters by application status (PENDING, SHORTLISTED, REJECTED).
 */
export declare const getJobPostApplications: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=jobPosts.controller.d.ts.map