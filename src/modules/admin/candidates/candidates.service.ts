// Service layer — business logic for the candidates module.

import { candidatesRepository, GetCandidatesOptions } from "./candidates.repository";

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;

// ─── DTO — what the API returns ───────────────────────────────────────────────

export interface CandidateDTO {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string;
  role: string;           // "STUDENT" or "PROFESSIONAL"
  isVerified: boolean;
  joinedAt: string;       // ISO date string
  authProvider: string;   // "LOCAL", "GOOGLE", or "LINKEDIN"
}

export interface CandidateListResponse {
  data: CandidateDTO[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CandidateStatsDTO {
  lookingForInternships: number;
  lookingForJobs: number;
  internshipApplyingRate: number;
  internshipHiringRate: number;
  jobApplyingRate: number;
  jobHiringRate: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toFullName(firstName: string | null, lastName: string | null): string {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}

function toAuthProvider(authAccounts: { provider: string }[]): string {
  if (authAccounts.length === 0) return "LOCAL";
  return authAccounts[0].provider; // GOOGLE, LINKEDIN, or LOCAL
}

function toDTO(user: any): CandidateDTO {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: toFullName(user.firstName, user.lastName),
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    joinedAt: user.createdAt.toISOString(),
    authProvider: toAuthProvider(user.authAccounts ?? []),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const candidatesService = {

  async getCandidateStats(): Promise<CandidateStatsDTO> {
    const { undergraduates, professionals } = await candidatesRepository.getStats();
    const total = undergraduates + professionals;

    return {
      lookingForInternships: undergraduates,
      lookingForJobs: professionals,
      internshipApplyingRate: total === 0 ? 0 : Math.round((undergraduates / total) * 100),
      internshipHiringRate: 0,
      jobApplyingRate: total === 0 ? 0 : Math.round((professionals / total) * 100),
      jobHiringRate: 0,
    };
  },

  async getCandidates(options: GetCandidatesOptions): Promise<CandidateListResponse> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, options.limit ?? DEFAULT_PAGE_LIMIT));
    const search = options.search?.trim() || undefined;

    const { candidates, total } = await candidatesRepository.findAll({
      search,
      role: options.role,
      page,
      limit,
    });

    return {
      data: candidates.map(toDTO),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getCandidateById(userId: string): Promise<CandidateDTO> {
    const user = await candidatesRepository.findById(userId);

    if (!user) {
      const err: any = new Error("Candidate not found");
      err.statusCode = 404;
      throw err;
    }

    return toDTO(user);
  },

  async deleteCandidate(userId: string): Promise<void> {
    const exists = await candidatesRepository.isCandidate(userId);

    if (!exists) {
      const err: any = new Error("Candidate not found");
      err.statusCode = 404;
      throw err;
    }

    await candidatesRepository.deleteById(userId);
  },
};