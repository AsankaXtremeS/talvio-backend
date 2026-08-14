import { NextFunction, Request, Response } from "express";
export declare const registerUser: (req: Request, res: Response) => Promise<void>;
export declare const registerEmployer: (req: Request, res: Response) => Promise<void>;
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const refresh: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const logout: (req: Request, res: Response) => Promise<void>;
export declare const forgotPassword: (req: Request, res: Response) => Promise<void>;
export declare const resetPassword: (req: Request, res: Response) => Promise<void>;
export declare const approveEmployer: (req: Request, res: Response) => Promise<void>;
export declare const rejectEmployer: (req: Request, res: Response) => Promise<void>;
export declare const getEmployersByStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getPendingEmployers: (req: Request, res: Response) => Promise<void>;
export declare const oauthStart: (req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const oauthCallback: (req: Request, res: Response, next: NextFunction) => Promise<any>;
export declare const me: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const updateMyRole: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=auth.controller.d.ts.map