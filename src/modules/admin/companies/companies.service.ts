// Admin company service.
// Applies business rules, validates input, and shapes repository data for the controller.

import { companiesRepository, GetCompaniesOptions } from "./companies.repository";

// Maximum number of records per page — prevents clients from requesting
// huge payloads that would strain the DB and slow the response.
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;

// Response shape types

export interface CompanyDTO {
  id: string;           // user ID (primary key we use for delete/view)
  companyName: string;
  email: string;
  companyLogoUrl?: string | null;
  postCount: number;
  joinedAt: string;     // ISO date string — frontend formats as needed
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

// Service implementation

export const companiesService = {

  /**
   * Get a paginated, searchable list of approved companies.
   */
  async getCompanies(options: GetCompaniesOptions): Promise<CompanyListResponse> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, options.limit ?? DEFAULT_PAGE_LIMIT));
    const search = options.search?.trim() || undefined;

    const { companies, total } = await companiesRepository.findAll({ search, page, limit });

    const data: CompanyDTO[] = companies.map((user) => ({
      id: user.id,
      companyName: user.employerProfile?.companyName ?? "Unknown",
      email: user.email,
      companyLogoUrl: user.employerProfile?.companyLogoUrl ?? null,
      postCount: user.employerProfile?._count.jobPosts ?? 0,
      joinedAt: user.createdAt.toISOString(),
    }));

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get an approved company by user ID.
   */
  async getCompanyById(userId: string): Promise<CompanyDTO> {
    const user = await companiesRepository.findById(userId);

    if (!user) {
      const err: any = new Error("Company not found");
      err.statusCode = 404;
      throw err;
    }

    return {
      id: user.id,
      companyName: user.employerProfile?.companyName ?? "Unknown",
      email: user.email,
      companyLogoUrl: user.employerProfile?.companyLogoUrl ?? null,
      postCount: user.employerProfile?._count.jobPosts ?? 0,
      joinedAt: user.createdAt.toISOString(),
    };
  },

  /**
   * Delete an approved employer and related records.
   */
  async deleteCompany(userId: string): Promise<void> {
    const exists = await companiesRepository.isApprovedEmployer(userId);

    if (!exists) {
      const err: any = new Error("Company not found");
      err.statusCode = 404;
      throw err;
    }

    await companiesRepository.deleteById(userId);
  },
};