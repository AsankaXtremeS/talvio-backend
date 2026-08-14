import { Request, Response } from "express";
type CompanyIdParams = {
    id: string;
};
export declare const getCompanies: (req: Request, res: Response) => Promise<void>;
export declare const getCompanyById: (req: Request<CompanyIdParams>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteCompany: (req: Request<CompanyIdParams>, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
//# sourceMappingURL=companies.controller.d.ts.map