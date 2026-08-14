import { jobpostService } from "../jobpost.service";
import { jobpostRepository } from "../jobpost.repository";

jest.mock("../jobpost.repository");

describe("jobpostService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getJobPosts", () => {
    it("should return paginated list of job posts", async () => {
      const mockPosts = [
        {
          id: "post-1",
          title: "Software Engineer",
          type: "JOB",
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          closingDate: new Date("2024-12-31"),
          employer: {
            companyName: "Talvio",
            user: { email: "hr@talvio.com" },
          },
          _count: { applications: 10 },
        },
      ];
      (jobpostRepository.findAll as jest.Mock).mockResolvedValue({
        posts: mockPosts,
        total: 1,
      });

      const result = await jobpostService.getJobPosts({ page: 1 });

      expect(result.data[0].jobTitle).toBe("Software Engineer");
      expect(result.data[0].companyName).toBe("Talvio");
      expect(result.data[0].category).toBe("Full-time");
      expect(result.data[0].closedApplications).toBe(10);
    });
  });

  describe("deleteJobPost", () => {
    it("should delete job post if it exists", async () => {
      (jobpostRepository.existsById as jest.Mock).mockResolvedValue(true);
      (jobpostRepository.deleteById as jest.Mock).mockResolvedValue({});

      await jobpostService.deleteJobPost("post-1");

      expect(jobpostRepository.deleteById).toHaveBeenCalledWith("post-1");
    });

    it("should throw 404 if job post does not exist", async () => {
      (jobpostRepository.existsById as jest.Mock).mockResolvedValue(false);

      await expect(jobpostService.deleteJobPost("post-1")).rejects.toThrow("Job post not found");
    });
  });
});
