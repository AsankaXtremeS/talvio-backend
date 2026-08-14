"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const companies_service_1 = require("../companies.service");
const companies_repository_1 = require("../companies.repository");
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
            companies_repository_1.companiesRepository.findAll.mockResolvedValue({
                companies: mockCompanies,
                total: 1,
            });
            const result = await companies_service_1.companiesService.getCompanies({ page: 1, limit: 10 });
            expect(result.data[0].companyName).toBe("Test Comp");
            expect(result.data[0].postCount).toBe(5);
            expect(result.pagination.totalPages).toBe(1);
        });
    });
    describe("deleteCompany", () => {
        it("should delete company if it is approved employer", async () => {
            companies_repository_1.companiesRepository.isApprovedEmployer.mockResolvedValue(true);
            companies_repository_1.companiesRepository.deleteById.mockResolvedValue({});
            await companies_service_1.companiesService.deleteCompany("comp-1");
            expect(companies_repository_1.companiesRepository.deleteById).toHaveBeenCalledWith("comp-1");
        });
        it("should throw 404 if company not found or not approved", async () => {
            companies_repository_1.companiesRepository.isApprovedEmployer.mockResolvedValue(false);
            await expect(companies_service_1.companiesService.deleteCompany("comp-1")).rejects.toThrow("Company not found");
        });
    });
});
//# sourceMappingURL=companies.service.spec.js.map