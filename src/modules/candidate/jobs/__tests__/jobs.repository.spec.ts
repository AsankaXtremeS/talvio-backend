import { jobsRepository } from "../jobs.repository";
import { prisma } from "../../../../config/db";
import { JobType } from "@prisma/client";

// Mock prisma
jest.mock("../../../../config/db", () => ({
  prisma: {
    jobPost: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe("jobsRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findNewJobsByType", () => {
    it("should fetch active jobs created in the last 24 hours", async () => {
      const mockJobs = [
        { id: "1", title: "Job 1", employer: { companyName: "Co 1" } }
      ];
      (prisma.jobPost.findMany as jest.Mock).mockResolvedValue(mockJobs);

      const result = await jobsRepository.findNewJobsByType(JobType.JOB);

      expect(prisma.jobPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "ACTIVE",
            type: JobType.JOB,
            createdAt: expect.any(Object)
          })
        })
      );
      expect(result).toEqual(mockJobs);
    });
  });

  describe("findActiveJobsByType", () => {
    it("should return paginated active jobs and total count", async () => {
      const mockJobs = [{ id: "1", title: "Job 1", employer: {} }];
      (prisma.jobPost.findMany as jest.Mock).mockResolvedValue(mockJobs);
      (prisma.jobPost.count as jest.Mock).mockResolvedValue(1);

      const result = await jobsRepository.findActiveJobsByType(JobType.INTERNSHIP, 1, 10);

      expect(prisma.jobPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "ACTIVE", type: JobType.INTERNSHIP },
          skip: 0,
          take: 10
        })
      );
      expect(result).toEqual({ jobs: mockJobs, total: 1 });
    });
  });
});
