import { Request, Response } from "express";
export declare const getApplications: (req: Request, res: Response) => Promise<void>;
export declare const getApplicationWithHistory: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const applyForJob: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const withdrawApplication: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getStats: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getApplicationDetail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=applications.controller.d.ts.map