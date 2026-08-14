// Admin company repository.
// Database access only. Business logic belongs in services.

import { prisma } from "../../../config/db";

// Types

export interface GetCompaniesOptions {
  search?: string;       // filter by company name or email (case-insensitive)
  page?: number;         // 1-based page number (default: 1)
  limit?: number;        // records per page (default: 20, max enforced in service)
}

// ─── Repository ──────────────────────────────────────────────────────────────

export const companiesRepository = {

  /**
   * Return a paginated list of approved employers with profile data.
   */
  async findAll(options: GetCompaniesOptions = {}) {
    const { search, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // Build a reusable "where" clause — search applies to both name and email
    const where = {
      role: "EMPLOYER" as const,
      employerProfile: {
        verificationStatus: "APPROVED" as const,
      },
      // If search term provided, also match user's email
      ...(search
        ? {
            OR: [
              {
                employerProfile: {
                  companyName: { contains: search, mode: "insensitive" as const },
                },
              },
              {
                email: { contains: search, mode: "insensitive" as const },
              },
            ],
          }
        : {}),
    };

    // Run count + data queries in parallel for performance
    const [total, companies] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
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
   * Find an approved employer by user ID.
   * Returns null if not found.
   */
  async findById(userId: string) {
    return prisma.user.findFirst({
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
   * Hard-delete a user and related records via Prisma cascade.
   */
  async deleteById(userId: string) {
    return prisma.user.delete({
      where: { id: userId },
    });
  },

  /**
   * Check whether the user is an approved employer.
   */
  async isApprovedEmployer(userId: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
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