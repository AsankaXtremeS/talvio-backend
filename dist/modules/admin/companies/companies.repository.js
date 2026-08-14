"use strict";
// Repository layer for admin company management.
// Responsible ONLY for database access — no business logic lives here.
// All queries are built with Prisma and typed explicitly.
Object.defineProperty(exports, "__esModule", { value: true });
exports.companiesRepository = void 0;
const db_1 = require("../../../config/db");
// ─── Repository ───────────────────────────────────────────────────────────────
exports.companiesRepository = {
    /**
     * Return a paginated, optionally-filtered list of approved EMPLOYER accounts.
     * Each record includes the joined User + EmployerProfile data.
     *
     * Why we filter by verificationStatus = APPROVED:
     *   Pending/rejected employers are managed in the Pending Approvals module.
     *   The Companies page shows only active, approved companies.
     */
    async findAll(options = {}) {
        const { search, page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        // Build a reusable "where" clause — search applies to both name and email
        const where = {
            role: "EMPLOYER",
            employerProfile: {
                verificationStatus: "APPROVED",
            },
            // If search term provided, also match user's email
            ...(search
                ? {
                    OR: [
                        {
                            employerProfile: {
                                companyName: { contains: search, mode: "insensitive" },
                            },
                        },
                        {
                            email: { contains: search, mode: "insensitive" },
                        },
                    ],
                }
                : {}),
        };
        // Run count + data queries in parallel for performance
        const [total, companies] = await Promise.all([
            db_1.prisma.user.count({ where }),
            db_1.prisma.user.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    createdAt: true,
                    employerProfile: {
                        select: {
                            id: true,
                            companyName: true,
                            companyLogoUrl: true,
                            verificationStatus: true,
                            createdAt: true,
                            _count: {
                                select: {
                                    jobPosts: true,
                                },
                            },
                        },
                    },
                },
            }),
        ]);
        return { companies, total };
    },
    /**
     * Find a single company (approved employer) by their user ID.
     * Returns null if not found — the service layer decides how to handle that.
     */
    async findById(userId) {
        return db_1.prisma.user.findFirst({
            where: {
                id: userId,
                role: "EMPLOYER",
                employerProfile: {
                    verificationStatus: "APPROVED",
                },
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                createdAt: true,
                employerProfile: {
                    select: {
                        id: true,
                        companyName: true,
                        companyLogoUrl: true,
                        verificationStatus: true,
                        createdAt: true,
                        _count: {
                            select: {
                                jobPosts: true,
                            },
                        },
                    },
                },
            },
        });
    },
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
    async deleteById(userId) {
        return db_1.prisma.user.delete({
            where: { id: userId },
        });
    },
    /**
     * Verify a user is an approved employer before we allow deletion.
     * Separated from deleteById so the service can return a clear 404 vs 403.
     */
    async isApprovedEmployer(userId) {
        const user = await db_1.prisma.user.findFirst({
            where: {
                id: userId,
                role: "EMPLOYER",
                employerProfile: { verificationStatus: "APPROVED" },
            },
            select: { id: true },
        });
        return user !== null;
    },
};
//# sourceMappingURL=companies.repository.js.map