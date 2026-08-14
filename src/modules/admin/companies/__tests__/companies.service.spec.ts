import { companiesService } from "../companies.service";
import { companiesRepository } from "../companies.repository";

jest.mock("../companies.repository");

describe("companiesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCompanies", () => {
    it("should return paginated list of approved companies", async () => {
      const mockCompanies = [
        {
          id: "comp-1",
          email: "hr@comp.com",
          createdAt: new Date("2024-01-01"),
          employerProfile: {
            companyName: "Test Comp",
            companyLogoUrl: "logo.png",
            _count: { jobPosts: 5 },
          },
        },
      ];
      (companiesRepository.findAll as jest.Mock).mockResolvedValue({
        companies: mockCompanies,
        total: 1,
      });

      const result = await companiesService.getCompanies({ page: 1, limit: 10 });

      expect(result.data[0].companyName).toBe("Test Comp");
      expect(result.data[0].postCount).toBe(5);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe("deleteCompany", () => {
    it("should delete company if it is approved employer", async () => {
      (companiesRepository.isApprovedEmployer as jest.Mock).mockResolvedValue(true);
      (companiesRepository.deleteById as jest.Mock).mockResolvedValue({});

      await companiesService.deleteCompany("comp-1");

      expect(companiesRepository.deleteById).toHaveBeenCalledWith("comp-1");
    });

    it("should throw 404 if company not found or not approved", async () => {
      (companiesRepository.isApprovedEmployer as jest.Mock).mockResolvedValue(false);

      await expect(companiesService.deleteCompany("comp-1")).rejects.toThrow("Company not found");
    });
  });
});
