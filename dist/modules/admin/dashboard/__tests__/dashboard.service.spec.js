"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dashboard_service_1 = require("../dashboard.service");
const dashboard_repository_1 = require("../dashboard.repository");
// Mock repository
jest.mock("../dashboard.repository");
describe("dashboardService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Clear cache by resetting the internal variable if possible, 
        // or just rely on the fact that each test might use different data or wait for TTL.
        // Since we can't easily reset the private cache variable from outside without exports,
        // we should be careful with shared state.
    });
    describe("getOverview", () => {
        it("should return formatted dashboard overview", async () => {
            const mockRoleCounts = { totalUsers: 100, undergraduates: 60, professionals: 40 };
            const mockCompanyCounts = { totalCompanies: 10, pendingApprovals: 2 };
            const mockGrowthSeries = [
                { monthStart: new Date("2024-01-01"), totalUsers: 10 },
                { monthStart: new Date("2024-02-01"), totalUsers: 25 },
            ];
            const mockActivitySeries = [
                { monthStart: new Date("2024-01-01"), candidates: 5, companies: 2 },
            ];
            const mockRecentCandidates = [
                { id: "1", firstName: "John", lastName: "Doe", role: "STUDENT" },
            ];
            const mockMonthlyCounts = {
                applied: { current: 50, previous: 40 },
                hired: { current: 10, previous: 5 },
                scheduled: { current: 20, previous: 20 },
            };
            dashboard_repository_1.dashboardRepository.getUserRoleCounts.mockResolvedValue(mockRoleCounts);
            dashboard_repository_1.dashboardRepository.getCompanyCounts.mockResolvedValue(mockCompanyCounts);
            dashboard_repository_1.dashboardRepository.getUserGrowthSeries.mockResolvedValue(mockGrowthSeries);
            dashboard_repository_1.dashboardRepository.getCandidatesCompaniesActivitySeries.mockResolvedValue(mockActivitySeries);
            dashboard_repository_1.dashboardRepository.getRecentCandidates.mockResolvedValue(mockRecentCandidates);
            dashboard_repository_1.dashboardRepository.getCurrentAndPreviousMonthCounts.mockResolvedValue(mockMonthlyCounts);
            const result = await dashboard_service_1.dashboardService.getOverview();
            expect(result.stats.totalUsers).toBe(100);
            expect(result.stats.totalCompanies).toBe(10);
            expect(result.userGrowth[0].month).toBe("Jan");
            expect(result.recentCandidates[0].name).toBe("John Doe");
            expect(result.applicationStats.appliedGrowth).toBe(25); // (50-40)/40 * 100
            expect(result.applicationStats.hiredGrowth).toBe(100); // (10-5)/5 * 100
            expect(result.applicationStats.scheduledGrowth).toBe(0);
        });
    });
});
//# sourceMappingURL=dashboard.service.spec.js.map