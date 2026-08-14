import { Request, Response } from "express";
/**
 * Get the current candidate's profile
 */
export declare const getProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Update candidate's default resume
 */
export declare const updateResume: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * Remove candidate's default resume
 */
export declare const removeResume: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=profile.controller.d.ts.map