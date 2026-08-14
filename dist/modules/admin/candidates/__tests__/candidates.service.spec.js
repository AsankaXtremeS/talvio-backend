"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const candidates_service_1 = require("../candidates.service");
const candidates_repository_1 = require("../candidates.repository");
jest.mock("../candidates.repository");
describe("candidatesService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe("getCandidateStats", () => {
        it("should return calculated candidate stats", async () => {
            candidates_repository_1.candidatesRepository.getStats.mockResolvedValue({
                undergraduates: 30,
                professionals: 70,
            });
            const stats = await candidates_service_1.candidatesService.getCandidateStats();
            expect(stats.lookingForInternships).toBe(30);
            expect(stats.lookingForJobs).toBe(70);
            expect(stats.internshipApplyingRate).toBe(30);
            expect(stats.jobApplyingRate).toBe(70);
        });
    });
    describe("getCandidates", () => {
        it("should return paginated list of candidates", async () => {
            const mockCandidates = [
                {
                    id: "1",
                    firstName: "John",
                    lastName: "Doe",
                    email: "john@example.com",
                    role: "STUDENT",
                    isVerified: true,
                    createdAt: new Date("2024-01-01"),
                    authAccounts: [{ provider: "GOOGLE" }],
                },
            ];
            candidates_repository_1.candidatesRepository.findAll.mockResolvedValue({
                candidates: mockCandidates,
                total: 1,
            });
            const result = await candidates_service_1.candidatesService.getCandidates({ page: 1, limit: 10 });
            expect(result.data[0].fullName).toBe("John Doe");
            expect(result.data[0].authProvider).toBe("GOOGLE");
            expect(result.pagination.total).toBe(1);
        });
    });
    describe("deleteCandidate", () => {
        it("should delete candidate if they exist", async () => {
            candidates_repository_1.candidatesRepository.isCandidate.mockResolvedValue(true);
            candidates_repository_1.candidatesRepository.deleteById.mockResolvedValue({});
            await candidates_service_1.candidatesService.deleteCandidate("user-123");
            expect(candidates_repository_1.candidatesRepository.deleteById).toHaveBeenCalledWith("user-123");
        });
        it("should throw 404 if candidate does not exist", async () => {
            candidates_repository_1.candidatesRepository.isCandidate.mockResolvedValue(false);
            await expect(candidates_service_1.candidatesService.deleteCandidate("user-123")).rejects.toThrow("Candidate not found");
        });
    });
});
//# sourceMappingURL=candidates.service.spec.js.map