"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardService = void 0;
const dashboard_repository_1 = require("./dashboard.repository");
const DASHBOARD_CACHE_TTL_MS = 30 * 1000;
let dashboardOverviewCache = null;
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });
const toMonthLabel = (date) => monthFormatter.format(date);
const toFullName = (firstName, lastName) => {
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    return fullName || "Unknown";
};
const toCandidateRoleLabel = (role) => role === "STUDENT" ? "Student Candidate" : "Professional Candidate";
const growthPercent = (current, previous) => {
    if (previous === 0) {
        return current > 0 ? 100 : 0;
    }
    return Number((((current - previous) / previous) * 100).toFixed(1));
};
exports.dashboardService = {
    async getOverview() {
        if (dashboardOverviewCache && dashboardOverviewCache.expiresAt > Date.now()) {
            return dashboardOverviewCache.value;
        }
        const [userRoleCounts, companyCounts, userGrowth, candidatesCompaniesActivity, recentCandidates, monthlyCounts,] = await Promise.all([
            dashboard_repository_1.dashboardRepository.getUserRoleCounts(),
            dashboard_repository_1.dashboardRepository.getCompanyCounts(),
            dashboard_repository_1.dashboardRepository.getUserGrowthSeries(),
            dashboard_repository_1.dashboardRepository.getCandidatesCompaniesActivitySeries(),
            dashboard_repository_1.dashboardRepository.getRecentCandidates(),
            dashboard_repository_1.dashboardRepository.getCurrentAndPreviousMonthCounts(),
        ]);
        const overview = {
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
//# sourceMappingURL=dashboard.service.js.map