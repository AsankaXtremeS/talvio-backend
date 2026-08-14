import { jobsService } from "../jobs.service";
import { jobsRepository } from "../jobs.repository";
import { JobType } from "@prisma/client";

// Mock the repository
jest.mock("../jobs.repository");

describe("jobsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockJobData = {
    id: "job-123",
    title: "Software Engineer",
    type: JobType.JOB,
    createdAt: new Date(),
    employer: {
      companyName: "Talvio Tech",
      companyLogoUrl: "logo.png",
      companyLocation: "NY",
    }
  };

  describe("getNewJobsByRole", () => {
    it("should return formatted jobs for PROFESSIONAL role (JOB type)", async () => {
      (jobsRepository.findNewJobsByType as jest.Mock).mockResolvedValue([mockJobData]);

      const result = await jobsService.getNewJobsByRole("PROFESSIONAL");

      expect(jobsRepository.findNewJobsByType).toHaveBeenCalledWith(JobType.JOB);
      expect(result.count).toBe(1);
      expect(result.jobs[0].company).toBe("Talvio Tech");
    });

    it("should return formatted jobs for STUDENT role (INTERNSHIP type)", async () => {
      (jobsRepository.findNewJobsByType as jest.Mock).mockResolvedValue([
        { ...mockJobData, type: JobType.INTERNSHIP }
      ]);

      const result = await jobsService.getNewJobsByRole("STUDENT");

      expect(jobsRepository.findNewJobsByType).toHaveBeenCalledWith(JobType.INTERNSHIP);
      expect(result.jobs[0].type).toBe(JobType.INTERNSHIP);
    });
  });

  describe("getJobsByRole", () => {
    it("should return paginated and formatted jobs list", async () => {
      (jobsRepository.findActiveJobsByType as jest.Mock).mockResolvedValue({
        jobs: [mockJobData],
        total: 1
      });

      const result = await jobsService.getJobsByRole("PROFESSIONAL", 1, 10);

      expect(jobsRepository.findActiveJobsByType).toHaveBeenCalledWith(JobType.JOB, 1, 10);
      expect(result.jobs).toHaveLength(1);
      expect(result.totalPages).toBe(1);
      expect(result.jobs[0].title).toBe("Software Engineer");
    });
  });
});
