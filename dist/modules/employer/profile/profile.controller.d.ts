import { Request, Response } from "express";
export declare const getProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCalendarAuthUrl: (req: Request, res: Response) => Promise<void>;
export declare const connectCalendar: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const disconnectCalendar: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=profile.controller.d.ts.map