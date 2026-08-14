import { Request, Response, NextFunction } from "express";
export declare function requireRole(role: string | string[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=role.middleware.d.ts.map