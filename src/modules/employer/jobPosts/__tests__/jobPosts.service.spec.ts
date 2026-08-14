/**
 * jobPosts.service.spec.ts
 *
 * Unit tests for jobsService — covering:
 *   1. getStats       — happy path, unapproved employer guard, not-found guard
 *   2. getJobPosts    — happy path, pagination bounds, search trim, filtering
 *   3. getJobPostById — happy path, 404 on missing/unowned post
 *   4. createJobPost  — happy path, unapproved employer guard
 *   5. updateJobPost  — happy path, ownership guard, not-found guard
 *   6. deleteJobPost  — happy path, active post guard, ownership guard
 *   7. getApplicationsByJobPost — happy path, ownership guard
 *   8. markReviewed   — happy path, missing job guard, missing application guard
 *   9. markShortlisted — happy path, missing application guard
 *
 * All DB access is mocked via jobsRepository.
 * Prisma is mocked at the module level to prevent initialisation errors.
 */

import { jobsService } from "../jobPosts.service";
import { jobsRepository } from "../jobPosts.repository";

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("@prisma/client", () => ({
  VerificationStatus: { APPROVED: "APPROVED", PENDING: "PENDING", REJECTED: "REJECTED" },
  PostStatus: { ACTIVE: "ACTIVE", DRAFT: "DRAFT", CLOSED: "CLOSED" },
}));

jest.mock("../../../../config/db", () => ({
  prisma: {
    jobPost: { groupBy: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    application: { count: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock("../jobPosts.repository");

// ─── Shared fixtures ──────────────────────────────────────────────────────────

/** Minimal approved employer profile returned by the repository */
const approvedEmployerProfile = {
  id: "employer-profile-001",
  verificationStatus: "APPROVED",
};

/** Raw DB job post row as Prisma would return it */
const basePost = {
  id: "post-001",
  title: "Senior Software Engineer",
  type: "JOB",
  status: "ACTIVE",
  description: "A great role.",
  responsibilities: "Lead the team.",
  requirements: "5+ years experience.",
  additionalInformation: "Remote-friendly.",
  skills: "TypeScript, Node.js",
  workMode: "REMOTE",
  employmentType: "FULL_TIME",
  closingDate: new Date("2026-12-31"),
  location: "Colombo, Sri Lanka",
  employer: { companyName: "Talvio Corp", companyLogoUrl: null },
  _count: { applications: 3 },
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-06-01"),
};

/** Minimal create input matching the Zod schema */
const createInput = {
  title: "Junior Developer",
  type: "Job" as const,
  closingDate: "2026-12-31",
  location: "Colombo",
  description: "We are looking for a junior developer to join our team.",
  responsibilities: "Write clean code and participate in code reviews.",
  requirements: "Knowledge of JavaScript and basic web development skills.",
  additionalInformation: "Flexible working hours and remote-friendly environment.",
  skills: "JavaScript, HTML, CSS",
  workMode: "On site" as const,
  employmentType: "Full-time" as const,
  status: "Active" as const,
};

// ─────────────────────────────────────────────────────────────────────────────

describe("jobsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════
  // 1. getStats
  // ══════════════════════════════════════════════════════════════════
  describe("getStats", () => {
    it("should return dashboard stat counts for an approved employer", async () => {
      // Arrange
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(
        approvedEmployerProfile
      );
      (jobsRepository.getStats as jest.Mock).mockResolvedValue({
        TOTAL: 10,
        ACTIVE: 6,
        DRAFT: 3,
        CLOSED: 1,
        APPLICATIONS: 42,
      });

      // Act
      const result = await jobsService.getStats("user-001");

      // Assert — all five stat fields must be present
      expect(result.total).toBe(10);
      expect(result.active).toBe(6);
      expect(result.draft).toBe(3);
      expect(result.closed).toBe(1);
      expect(result.applications).toBe(42);
    });

    it("should call getStats with the employer profile ID, not the user ID", async () => {
      // Arrange
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(
        approvedEmployerProfile
      );
      (jobsRepository.getStats as jest.Mock).mockResolvedValue({
        TOTAL: 0, ACTIVE: 0, DRAFT: 0, CLOSED: 0, APPLICATIONS: 0,
      });

      // Act
      await jobsService.getStats("user-001");

      // Assert — repository must receive the profile ID, not the raw user ID
      expect(jobsRepository.getStats).toHaveBeenCalledWith("employer-profile-001");
    });

    it("should throw 404 when employer profile does not exist", async () => {
      // Arrange
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(jobsService.getStats("ghost-user")).rejects.toMatchObject({
        message: "Employer profile not found",
        statusCode: 404,
      });
    });

    it("should throw 403 when employer is PENDING", async () => {
      // Arrange
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue({
        ...approvedEmployerProfile,
        verificationStatus: "PENDING",
      });

      // Act & Assert
      await expect(jobsService.getStats("user-001")).rejects.toMatchObject({
        statusCode: 403,
        message: expect.stringContaining("not approved"),
      });
    });

    it("should throw 403 when employer is REJECTED", async () => {
      // Arrange
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue({
        ...approvedEmployerProfile,
        verificationStatus: "REJECTED",
      });

      // Act & Assert
      await expect(jobsService.getStats("user-001")).rejects.toMatchObject({
        statusCode: 403,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 2. getJobPosts
  // ══════════════════════════════════════════════════════════════════
  describe("getJobPosts", () => {
    beforeEach(() => {
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(
        approvedEmployerProfile
      );
    });

    it("should return paginated job posts with correct DTO shape", async () => {
      // Arrange
      (jobsRepository.findAll as jest.Mock).mockResolvedValue({
        posts: [basePost],
        total: 1,
      });

      // Act
      const result = await jobsService.getJobPosts("user-001", { page: 1, limit: 20 });

      // Assert — data array must have one item shaped as a DTO
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe("Senior Software Engineer");
      expect(result.data[0].status).toBe("Active");   // mapped from "ACTIVE"
      expect(result.data[0].type).toBe("Job");         // mapped from "JOB"
      expect(result.data[0].workMode).toBe("Remote");  // mapped from "REMOTE"
    });

    it("should include correct pagination metadata", async () => {
      // Arrange
      (jobsRepository.findAll as jest.Mock).mockResolvedValue({
        posts: [basePost, basePost],
        total: 45,
      });

      // Act
      const result = await jobsService.getJobPosts("user-001", { page: 2, limit: 10 });

      // Assert
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(45);
      expect(result.pagination.totalPages).toBe(5);
    });

    it("should clamp page to minimum of 1 when 0 is passed", async () => {
      // Arrange
      (jobsRepository.findAll as jest.Mock).mockResolvedValue({ posts: [], total: 0 });

      // Act
      const result = await jobsService.getJobPosts("user-001", { page: 0, limit: 10 });

      // Assert — page must never go below 1
      expect(result.pagination.page).toBe(1);
    });

    it("should cap limit at MAX_PAGE_LIMIT (100) to prevent abuse", async () => {
      // Arrange
      (jobsRepository.findAll as jest.Mock).mockResolvedValue({ posts: [], total: 0 });

      // Act — try to request 999 items per page
      const result = await jobsService.getJobPosts("user-001", { page: 1, limit: 999 });

      // Assert — limit must be capped at 100
      expect(result.pagination.limit).toBe(100);
    });

    it("should pass trimmed search string to the repository", async () => {
      // Arrange
      (jobsRepository.findAll as jest.Mock).mockResolvedValue({ posts: [], total: 0 });

      // Act — search with surrounding whitespace
      await jobsService.getJobPosts("user-001", { page: 1, limit: 10, search: "  engineer  " });

      // Assert — repository must receive clean search term
      expect(jobsRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ search: "engineer" })
      );
    });

    it("should pass status and type filters through to the repository", async () => {
      // Arrange
      (jobsRepository.findAll as jest.Mock).mockResolvedValue({ posts: [], total: 0 });

      // Act
      await jobsService.getJobPosts("user-001", {
        page: 1,
        limit: 10,
        status: "ACTIVE",
        type: "JOB",
      });

      // Assert
      expect(jobsRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: "ACTIVE", type: "JOB" })
      );
    });

    it("should return applicantsCount from _count.applications", async () => {
      // Arrange
      const postWithCount = { ...basePost, _count: { applications: 7 } };
      (jobsRepository.findAll as jest.Mock).mockResolvedValue({
        posts: [postWithCount],
        total: 1,
      });

      // Act
      const result = await jobsService.getJobPosts("user-001", { page: 1, limit: 10 });

      // Assert — applicantsCount must reflect the DB count
      expect(result.data[0].applicantsCount).toBe(7);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 3. getJobPostById
  // ══════════════════════════════════════════════════════════════════
  describe("getJobPostById", () => {
    beforeEach(() => {
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(
        approvedEmployerProfile
      );
    });

    it("should return the job post DTO when found and owned", async () => {
      // Arrange
      (jobsRepository.findById as jest.Mock).mockResolvedValue(basePost);

      // Act
      const result = await jobsService.getJobPostById("user-001", "post-001");

      // Assert
      expect(result.id).toBe("post-001");
      expect(result.title).toBe("Senior Software Engineer");
    });

    it("should call findById with both postId and employerId for ownership enforcement", async () => {
      // Arrange
      (jobsRepository.findById as jest.Mock).mockResolvedValue(basePost);

      // Act
      await jobsService.getJobPostById("user-001", "post-001");

      // Assert — ownership is enforced at the repository level
      expect(jobsRepository.findById).toHaveBeenCalledWith("post-001", "employer-profile-001");
    });

    it("should throw 404 when post does not exist or is not owned by this employer", async () => {
      // Arrange — repository returns null (not found OR wrong owner)
      (jobsRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(jobsService.getJobPostById("user-001", "other-post")).rejects.toMatchObject({
        message: "Job post not found",
        statusCode: 404,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 4. createJobPost
  // ══════════════════════════════════════════════════════════════════
  describe("createJobPost", () => {
    beforeEach(() => {
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(
        approvedEmployerProfile
      );
    });

    it("should create a job post and return a DTO", async () => {
      // Arrange
      const createdPost = {
        ...basePost,
        id: "post-new",
        title: "Junior Developer",
        status: "ACTIVE",
      };
      (jobsRepository.create as jest.Mock).mockResolvedValue(createdPost);

      // Act
      const result = await jobsService.createJobPost("user-001", createInput);

      // Assert
      expect(result.id).toBe("post-new");
      expect(result.title).toBe("Junior Developer");
    });

    it("should call create with the employer profile ID", async () => {
      // Arrange
      (jobsRepository.create as jest.Mock).mockResolvedValue({ ...basePost });

      // Act
      await jobsService.createJobPost("user-001", createInput);

      // Assert — must use profile ID, not user ID
      expect(jobsRepository.create).toHaveBeenCalledWith("employer-profile-001", createInput);
    });

    it("should throw 403 when a PENDING employer tries to create a post", async () => {
      // Arrange
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue({
        ...approvedEmployerProfile,
        verificationStatus: "PENDING",
      });

      // Act & Assert
      await expect(jobsService.createJobPost("user-001", createInput)).rejects.toMatchObject({
        statusCode: 403,
      });

      // Repository create must NOT be called
      expect(jobsRepository.create).not.toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 5. updateJobPost
  // ══════════════════════════════════════════════════════════════════
  describe("updateJobPost", () => {
    beforeEach(() => {
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(
        approvedEmployerProfile
      );
    });

    it("should update and return the updated DTO", async () => {
      // Arrange
      const updatedPost = { ...basePost, title: "Lead Engineer" };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(basePost);
      (jobsRepository.update as jest.Mock).mockResolvedValue(updatedPost);

      // Act
      const result = await jobsService.updateJobPost("user-001", "post-001", {
        title: "Lead Engineer",
      });

      // Assert
      expect(result.title).toBe("Lead Engineer");
    });

    it("should throw 404 when trying to update a post not owned by this employer", async () => {
      // Arrange — findById returns null (wrong owner)
      (jobsRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        jobsService.updateJobPost("user-001", "other-post", { title: "Hacked" })
      ).rejects.toMatchObject({
        statusCode: 404,
      });

      // DB write must NOT occur
      expect(jobsRepository.update).not.toHaveBeenCalled();
    });

    it("should allow status change from Active to Closed", async () => {
      // Arrange
      const activePost = { ...basePost, status: "ACTIVE" };
      const closedPost = { ...basePost, status: "CLOSED" };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(activePost);
      (jobsRepository.update as jest.Mock).mockResolvedValue(closedPost);

      // Act
      const result = await jobsService.updateJobPost("user-001", "post-001", {
        status: "Closed",
      });

      // Assert
      expect(result.status).toBe("Closed");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 6. deleteJobPost
  // ══════════════════════════════════════════════════════════════════
  describe("deleteJobPost", () => {
    beforeEach(() => {
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(
        approvedEmployerProfile
      );
    });

    it("should delete a DRAFT post successfully", async () => {
      // Arrange
      const draftPost = { ...basePost, status: "DRAFT" };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(draftPost);
      (jobsRepository.deleteById as jest.Mock).mockResolvedValue(undefined);

      // Act — should resolve without error
      await expect(
        jobsService.deleteJobPost("user-001", "post-001")
      ).resolves.toBeUndefined();

      expect(jobsRepository.deleteById).toHaveBeenCalledWith("post-001", "employer-profile-001");
    });

    it("should delete a CLOSED post successfully", async () => {
      // Arrange
      const closedPost = { ...basePost, status: "CLOSED" };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(closedPost);
      (jobsRepository.deleteById as jest.Mock).mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        jobsService.deleteJobPost("user-001", "post-001")
      ).resolves.toBeUndefined();
    });

    it("should throw 409 when trying to delete an ACTIVE post", async () => {
      // Arrange — Active posts must be closed before deletion (business rule)
      const activePost = { ...basePost, status: "ACTIVE" };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(activePost);

      // Act & Assert
      await expect(
        jobsService.deleteJobPost("user-001", "post-001")
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining("Active job posts cannot be deleted"),
      });

      // Repository delete must NOT be called
      expect(jobsRepository.deleteById).not.toHaveBeenCalled();
    });

    it("should throw 404 when post is not found or not owned", async () => {
      // Arrange
      (jobsRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        jobsService.deleteJobPost("user-001", "non-existent")
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 7. getApplicationsByJobPost
  // ══════════════════════════════════════════════════════════════════
  describe("getApplicationsByJobPost", () => {
    beforeEach(() => {
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(
        approvedEmployerProfile
      );
    });

    it("should return formatted candidate list for a job post", async () => {
      // Arrange
      const rawApplications = [
        {
          candidateProfile: {
            id: "cand-001",
            user: { firstName: "Alice", lastName: "Smith", email: "alice@example.com" },
            headline: "Full Stack Developer",
            skills: ["TypeScript", "React"],
            profilePictureUrl: null,
          },
          applicationStatus: "PENDING",
          appliedAt: new Date("2024-06-01"),
          cvUrl: "https://cdn.example.com/alice-cv.pdf",
          aiScore: 87,
        },
      ];
      (jobsRepository.findApplicationsByJobPost as jest.Mock).mockResolvedValue(rawApplications);

      // Act
      const result = await jobsService.getApplicationsByJobPost("user-001", "post-001");

      // Assert — candidate shape must be correctly formatted
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice Smith");
      expect(result[0].email).toBe("alice@example.com");
      expect(result[0].status).toBe("PENDING");
      expect(result[0].aiScore).toBe(87);
      expect(result[0].cvUrl).toBe("https://cdn.example.com/alice-cv.pdf");
    });

    it("should pass optional status filter to the repository", async () => {
      // Arrange
      (jobsRepository.findApplicationsByJobPost as jest.Mock).mockResolvedValue([]);

      // Act
      await jobsService.getApplicationsByJobPost("user-001", "post-001", "SHORTLISTED");

      // Assert — status filter must be passed through
      expect(jobsRepository.findApplicationsByJobPost).toHaveBeenCalledWith(
        "post-001",
        "employer-profile-001",
        "SHORTLISTED"
      );
    });

    it("should return empty array when no applications exist", async () => {
      // Arrange
      (jobsRepository.findApplicationsByJobPost as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await jobsService.getApplicationsByJobPost("user-001", "post-001");

      // Assert
      expect(result).toEqual([]);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 8. markReviewed
  // ══════════════════════════════════════════════════════════════════
  describe("markReviewed", () => {
    beforeEach(() => {
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(
        approvedEmployerProfile
      );
    });

    it("should mark the application as reviewed", async () => {
      // Arrange
      const mockApp = { id: "app-001", isReviewed: true };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(basePost);
      (jobsRepository.findApplicationByJobAndCandidate as jest.Mock).mockResolvedValue(mockApp);
      (jobsRepository.markReviewed as jest.Mock).mockResolvedValue({ ...mockApp });

      // Act
      await jobsService.markReviewed("user-001", "post-001", "cand-001");

      // Assert — the correct application ID must be passed to markReviewed
      expect(jobsRepository.markReviewed).toHaveBeenCalledWith("app-001");
    });

    it("should throw 404 when the job post is not found", async () => {
      // Arrange
      (jobsRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        jobsService.markReviewed("user-001", "bad-post", "cand-001")
      ).rejects.toMatchObject({
        message: "Job post not found",
        statusCode: 404,
      });
    });

    it("should throw 404 when the application is not found", async () => {
      // Arrange
      (jobsRepository.findById as jest.Mock).mockResolvedValue(basePost);
      (jobsRepository.findApplicationByJobAndCandidate as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        jobsService.markReviewed("user-001", "post-001", "ghost-cand")
      ).rejects.toMatchObject({
        message: "Application not found",
        statusCode: 404,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 9. markShortlisted
  // ══════════════════════════════════════════════════════════════════
  describe("markShortlisted", () => {
    beforeEach(() => {
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(
        approvedEmployerProfile
      );
    });

    it("should shortlist the candidate's application", async () => {
      // Arrange
      const mockApp = { id: "app-001", isShortlisted: true, applicationStatus: "SHORTLISTED" };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(basePost);
      (jobsRepository.findApplicationByJobAndCandidate as jest.Mock).mockResolvedValue(mockApp);
      (jobsRepository.markShortlisted as jest.Mock).mockResolvedValue({ ...mockApp });

      // Act
      await jobsService.markShortlisted("user-001", "post-001", "cand-001");

      // Assert — markShortlisted must be called with application ID
      expect(jobsRepository.markShortlisted).toHaveBeenCalledWith("app-001");
    });

    it("should throw 404 when the job post does not belong to this employer", async () => {
      // Arrange
      (jobsRepository.findById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        jobsService.markShortlisted("user-001", "other-post", "cand-001")
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it("should throw 404 when the application does not exist", async () => {
      // Arrange
      (jobsRepository.findById as jest.Mock).mockResolvedValue(basePost);
      (jobsRepository.findApplicationByJobAndCandidate as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        jobsService.markShortlisted("user-001", "post-001", "ghost-cand")
      ).rejects.toMatchObject({
        message: "Application not found",
        statusCode: 404,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 10. DTO mapping — mapToDTO correctness
  // ══════════════════════════════════════════════════════════════════
  describe("DTO mapping", () => {
    beforeEach(() => {
      (jobsRepository.findEmployerProfileByUserId as jest.Mock).mockResolvedValue(
        approvedEmployerProfile
      );
      (jobsRepository.findById as jest.Mock).mockResolvedValue(basePost);
    });

    it("should map INTERNSHIP type correctly", async () => {
      // Arrange
      const internshipPost = { ...basePost, type: "INTERNSHIP" };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(internshipPost);

      // Act
      const result = await jobsService.getJobPostById("user-001", "post-001");

      // Assert
      expect(result.type).toBe("Internship");
    });

    it("should map ON_SITE workMode correctly", async () => {
      // Arrange
      const onSitePost = { ...basePost, workMode: "ON_SITE" };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(onSitePost);

      // Act
      const result = await jobsService.getJobPostById("user-001", "post-001");

      // Assert
      expect(result.workMode).toBe("On site");
    });

    it("should map HYBRID workMode correctly", async () => {
      // Arrange
      const hybridPost = { ...basePost, workMode: "HYBRID" };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(hybridPost);

      // Act
      const result = await jobsService.getJobPostById("user-001", "post-001");

      // Assert
      expect(result.workMode).toBe("Hybrid");
    });

    it("should map PART_TIME employmentType correctly", async () => {
      // Arrange
      const partTimePost = { ...basePost, employmentType: "PART_TIME" };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(partTimePost);

      // Act
      const result = await jobsService.getJobPostById("user-001", "post-001");

      // Assert
      expect(result.employmentType).toBe("Part-time");
    });

    it("should format closingDate as YYYY-MM-DD string", async () => {
      // Arrange — closingDate is a Date object from Prisma
      (jobsRepository.findById as jest.Mock).mockResolvedValue(basePost);

      // Act
      const result = await jobsService.getJobPostById("user-001", "post-001");

      // Assert — must be ISO date-only string (no time component)
      expect(result.closingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.closingDate).toBe("2026-12-31");
    });

    it("should return 0 applicantsCount when _count.applications is missing", async () => {
      // Arrange — post without _count (e.g. create response)
      const postNoCount = { ...basePost, _count: undefined };
      (jobsRepository.findById as jest.Mock).mockResolvedValue(postNoCount);

      // Act
      const result = await jobsService.getJobPostById("user-001", "post-001");

      // Assert — must default to 0, not throw or return undefined
      expect(result.applicantsCount).toBe(0);
    });
  });
});