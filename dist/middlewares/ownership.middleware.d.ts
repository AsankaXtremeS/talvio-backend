import { Request, Response, NextFunction } from "express";
interface OwnershipOptions {
    paramName?: string;
    allowAdmin?: boolean;
}
export declare function requireOwnership(options?: OwnershipOptions): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export {};
//# sourceMappingURL=ownership.middleware.d.ts.map