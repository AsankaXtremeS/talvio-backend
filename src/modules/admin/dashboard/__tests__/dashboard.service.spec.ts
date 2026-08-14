import { dashboardService } from "../dashboard.service";
import { dashboardRepository } from "../dashboard.repository";

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

      (dashboardRepository.getUserRoleCounts as jest.Mock).mockResolvedValue(mockRoleCounts);
      (dashboardRepository.getCompanyCounts as jest.Mock).mockResolvedValue(mockCompanyCounts);
      (dashboardRepository.getUserGrowthSeries as jest.Mock).mockResolvedValue(mockGrowthSeries);
      (dashboardRepository.getCandidatesCompaniesActivitySeries as jest.Mock).mockResolvedValue(mockActivitySeries);
      (dashboardRepository.getRecentCandidates as jest.Mock).mockResolvedValue(mockRecentCandidates);
      (dashboardRepository.getCurrentAndPreviousMonthCounts as jest.Mock).mockResolvedValue(mockMonthlyCounts);

      const result = await dashboardService.getOverview();

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
