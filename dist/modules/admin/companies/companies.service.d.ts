import { GetCompaniesOptions } from "./companies.repository";
export interface CompanyDTO {
    id: string;
    companyName: string;
    email: string;
    companyLogoUrl?: string | null;
    postCount: number;
    joinedAt: string;
}
export interface CompanyListResponse {
    data: CompanyDTO[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export declare const companiesService: {
    /**
     * Get a paginated, searchable list of all approved companies.
     *
     * Business rules applied here:
     *  - page must be >= 1
     *  - limit is capped at MAX_PAGE_LIMIT (prevents abuse)
     *  - search string is trimmed
     *  - raw DB records are mapped to CompanyDTO (never expose raw DB shape)
     */
    getCompanies(options: GetCompaniesOptions): Promise<CompanyListResponse>;
    /**
     * Get a single company's profile by their user ID.
     * Throws a typed error the controller can map to the right HTTP status.
     */
    getCompanyById(userId: string): Promise<CompanyDTO>;
    /**
     * Delete a company (their user record + all related data via cascade).
     *
     * Business rules:
     *  - Only approved employers can be deleted through this endpoint
     *  - If the user doesn't exist or isn't an approved employer → 404
     *  - We do NOT allow deleting ADMIN accounts here (different endpoint)
     */
    deleteCompany(userId: string): Promise<void>;
};
//# sourceMappingURL=companies.service.d.ts.map