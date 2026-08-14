"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jobpost_service_1 = require("../jobpost.service");
const jobpost_repository_1 = require("../jobpost.repository");
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
            jobpost_repository_1.jobpostRepository.findAll.mockResolvedValue({
                posts: mockPosts,
                total: 1,
            });
            const result = await jobpost_service_1.jobpostService.getJobPosts({ page: 1 });
            expect(result.data[0].jobTitle).toBe("Software Engineer");
            expect(result.data[0].companyName).toBe("Talvio");
            expect(result.data[0].category).toBe("Full-time");
            expect(result.data[0].closedApplications).toBe(10);
        });
    });
    describe("deleteJobPost", () => {
        it("should delete job post if it exists", async () => {
            jobpost_repository_1.jobpostRepository.existsById.mockResolvedValue(true);
            jobpost_repository_1.jobpostRepository.deleteById.mockResolvedValue({});
            await jobpost_service_1.jobpostService.deleteJobPost("post-1");
            expect(jobpost_repository_1.jobpostRepository.deleteById).toHaveBeenCalledWith("post-1");
        });
        it("should throw 404 if job post does not exist", async () => {
            jobpost_repository_1.jobpostRepository.existsById.mockResolvedValue(false);
            await expect(jobpost_service_1.jobpostService.deleteJobPost("post-1")).rejects.toThrow("Job post not found");
        });
    });
});
//# sourceMappingURL=jobpost.service.spec.js.map