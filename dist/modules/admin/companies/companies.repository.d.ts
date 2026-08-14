export interface GetCompaniesOptions {
    search?: string;
    page?: number;
    limit?: number;
}
export declare const companiesRepository: {
    /**
     * Return a paginated, optionally-filtered list of approved EMPLOYER accounts.
     * Each record includes the joined User + EmployerProfile data.
     *
     * Why we filter by verificationStatus = APPROVED:
     *   Pending/rejected employers are managed in the Pending Approvals module.
     *   The Companies page shows only active, approved companies.
     */
    findAll(options?: GetCompaniesOptions): Promise<{
        companies: {
            id: string;
            email: string;
            createdAt: Date;
            employerProfile: {
                id: string;
                createdAt: Date;
                _count: {
                    jobPosts: number;
                };
                companyName: string;
                verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
                companyLogoUrl: string | null;
            } | null;
        }[];
        total: number;
    }>;
    /**
     * Find a single company (approved employer) by their user ID.
     * Returns null if not found — the service layer decides how to handle that.
     */
    findById(userId: string): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        firstName: string | null;
        lastName: string | null;
        employerProfile: {
            id: string;
            createdAt: Date;
            _count: {
                jobPosts: number;
            };
            companyName: string;
            verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
            companyLogoUrl: string | null;
        } | null;
    } | null>;
    /**
     * Hard-delete a user and all their related data.
     * Prisma Cascade (defined in schema) will remove:
     *   - EmployerProfile
     *   - RefreshTokens
     *   - PasswordResetTokens
     *   - VerificationTokens
     *   - AuthAccounts
     *
     * We verify the user is an EMPLOYER before deleting to prevent
     * accidental deletion of ADMIN or other role accounts.
     */
    deleteById(userId: string): Promise<{
        id: string;
        email: string;
        password: string | null;
        role: import(".prisma/client").$Enums.Role;
        isVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
    }>;
    /**
     * Verify a user is an approved employer before we allow deletion.
     * Separated from deleteById so the service can return a clear 404 vs 403.
     */
    isApprovedEmployer(userId: string): Promise<boolean>;
};
//# sourceMappingURL=companies.repository.d.ts.map