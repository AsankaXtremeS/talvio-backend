import { candidatesService } from "../candidates.service";
import { candidatesRepository } from "../candidates.repository";

jest.mock("../candidates.repository");

describe("candidatesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getCandidateStats", () => {
    it("should return calculated candidate stats", async () => {
      (candidatesRepository.getStats as jest.Mock).mockResolvedValue({
        undergraduates: 30,
        professionals: 70,
      });

      const stats = await candidatesService.getCandidateStats();

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
      (candidatesRepository.findAll as jest.Mock).mockResolvedValue({
        candidates: mockCandidates,
        total: 1,
      });

      const result = await candidatesService.getCandidates({ page: 1, limit: 10 });

      expect(result.data[0].fullName).toBe("John Doe");
      expect(result.data[0].authProvider).toBe("GOOGLE");
      expect(result.pagination.total).toBe(1);
    });
  });

  describe("deleteCandidate", () => {
    it("should delete candidate if they exist", async () => {
      (candidatesRepository.isCandidate as jest.Mock).mockResolvedValue(true);
      (candidatesRepository.deleteById as jest.Mock).mockResolvedValue({});

      await candidatesService.deleteCandidate("user-123");

      expect(candidatesRepository.deleteById).toHaveBeenCalledWith("user-123");
    });

    it("should throw 404 if candidate does not exist", async () => {
      (candidatesRepository.isCandidate as jest.Mock).mockResolvedValue(false);

      await expect(candidatesService.deleteCandidate("user-123")).rejects.toThrow("Candidate not found");
    });
  });
});
