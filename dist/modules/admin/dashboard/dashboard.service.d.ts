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
export declare const dashboardService: {
    getOverview(): Promise<DashboardOverviewDTO>;
};
//# sourceMappingURL=dashboard.service.d.ts.map