import { dashboardRepository } from "./dashboard.repository";

export interface DashboardStatsDTO {
  totalUsers: number;
  totalCompanies: number;
  undergraduates: number;
  professionals: number;
  pendingApprovals: number;
}

export interface UserGrowthDataPointDTO {
  month: string;
  users: number;
}

export interface CandidatesCompaniesActivityDataPointDTO {
  month: string;
  candidates: number;
  companies: number;
}

export interface RecentCandidateDTO {
  id: string;
  name: string;
  role: string;
}

export interface ApplicationStatsDTO {
  applied: number;
  hired: number;
  scheduled: number;
  appliedGrowth: number;
  hiredGrowth: number;
  scheduledGrowth: number;
}

export interface DashboardOverviewDTO {
  stats: DashboardStatsDTO;
  userGrowth: UserGrowthDataPointDTO[];
  candidatesCompaniesActivity: CandidatesCompaniesActivityDataPointDTO[];
  recentCandidates: RecentCandidateDTO[];
  applicationStats: ApplicationStatsDTO;
}

const DASHBOARD_CACHE_TTL_MS = 30 * 1000;

let dashboardOverviewCache: {
  value: DashboardOverviewDTO;
  expiresAt: number;
} | null = null;

const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

const toMonthLabel = (date: Date): string => monthFormatter.format(date);

const toFullName = (firstName: string | null, lastName: string | null): string => {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || "Unknown";
};

const toCandidateRoleLabel = (role: string): string =>
  role === "STUDENT" ? "Student Candidate" : "Professional Candidate";

const growthPercent = (current: number, previous: number): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
};

export const dashboardService = {
  async getOverview(): Promise<DashboardOverviewDTO> {
    if (dashboardOverviewCache && dashboardOverviewCache.expiresAt > Date.now()) {
      return dashboardOverviewCache.value;
    }

    const [
      userRoleCounts,
      companyCounts,
      userGrowth,
      candidatesCompaniesActivity,
      recentCandidates,
      monthlyCounts,
    ] = await Promise.all([
      dashboardRepository.getUserRoleCounts(),
      dashboardRepository.getCompanyCounts(),
      dashboardRepository.getUserGrowthSeries(),
      dashboardRepository.getCandidatesCompaniesActivitySeries(),
      dashboardRepository.getRecentCandidates(),
      dashboardRepository.getCurrentAndPreviousMonthCounts(),
    ]);

    const overview: DashboardOverviewDTO = {
      stats: {
        totalUsers: userRoleCounts.totalUsers,
        totalCompanies: companyCounts.totalCompanies,
        undergraduates: userRoleCounts.undergraduates,
        professionals: userRoleCounts.professionals,
        pendingApprovals: companyCounts.pendingApprovals,
      },
      userGrowth: userGrowth.map((point) => ({
        month: toMonthLabel(point.monthStart),
        users: point.totalUsers,
      })),
      candidatesCompaniesActivity: candidatesCompaniesActivity.map((point) => ({
        month: toMonthLabel(point.monthStart),
        candidates: point.candidates,
        companies: point.companies,
      })),
      recentCandidates: recentCandidates.map((candidate) => ({
        id: candidate.id,
        name: toFullName(candidate.firstName, candidate.lastName),
        role: toCandidateRoleLabel(candidate.role),
      })),
      applicationStats: {
        applied: monthlyCounts.applied.current,
        hired: monthlyCounts.hired.current,
        scheduled: monthlyCounts.scheduled.current,
        appliedGrowth: growthPercent(monthlyCounts.applied.current, monthlyCounts.applied.previous),
        hiredGrowth: growthPercent(monthlyCounts.hired.current, monthlyCounts.hired.previous),
        scheduledGrowth: growthPercent(monthlyCounts.scheduled.current, monthlyCounts.scheduled.previous),
      },
    };

    dashboardOverviewCache = {
      value: overview,
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL_MS,
    };

    return overview;
  },
};
