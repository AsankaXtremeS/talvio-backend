// Controller layer for employer job post management.
//
// A controller's ONLY job is HTTP: read the request, call the service,
// send the response. No business logic or DB queries belong here.
//
// Error handling pattern (same as companies.controller.ts):
//   Services throw errors with a statusCode property for known cases (404, 403).
//   resolveStatusCode() reads that to set the right HTTP status.
//   Anything without a statusCode falls back to 500.
//
// Pattern followed from: src/modules/admin/companies/companies.controller.ts

import { Request, Response } from "express";
import { jobsService } from "./jobPosts.service";
import {
  createJobPostSchema,
  updateJobPostSchema,
  jobPostQuerySchema,
} from "./jobPosts.validation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract the HTTP status code from a thrown error.
 * Services attach err.statusCode for known cases (403, 404, etc.).
 * Defaults to 500 for unexpected errors.
 */
const resolveStatusCode = (err: any): number => {
  if (isDbUnavailableError(err)) return 503;
  if (typeof err?.statusCode === "number") return err.statusCode;
  return 500;
};

const isDbUnavailableError = (err: any): boolean => {
  const message = typeof err?.message === "string" ? err.message.toLowerCase() : "";
  const name = typeof err?.name === "string" ? err.name : "";

  return (
    name === "PrismaClientInitializationError" ||
    name === "PrismaClientKnownRequestError" ||
    message.includes("can't reach database server") ||
    message.includes("database") ||
    message.includes("p1001")
  );
};

const getPublicErrorMessage = (err: any, fallback: string): string => {
  if (isDbUnavailableError(err)) {
    return "Service temporarily unavailable. Please try again in a moment.";
  }

  if (typeof err?.message === "string" && err.message.trim()) {
    return err.message;
  }

  return fallback;
};

const logControllerError = (scope: string, err: any): void => {
  if (isDbUnavailableError(err)) {
    console.error(`${scope} error: database unavailable`);
    return;
  }

  console.error(`${scope} error:`, err);
};

/**
 * Extract the authenticated user's ID from the request.
 * The `authenticate` middleware sets req.user from the JWT payload.
 * Returns null if user is not set (should never happen after authenticate middleware).
 */
const getUserId = (req: any): string | null => {
  return req.user?.id ?? req.user?.userId ?? null;
};

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};


// ─── GET /api/employer/job-posts/stats ────────────────────────────────────────
//
// Returns dashboard stats: total, active, draft, and closed post counts.
// Used to populate the stats cards at the top of the Job Posts page.
//
// Response: { total, active, draft, closed }
// IMPORTANT: Stats are calculated by counting job posts in each status.
// This helps employers quickly see how many posts in each state they have.

export const getJobPostStats = async (req: Request, res: Response) => {
  try {
    // Extract user ID from JWT payload (set by authenticate middleware)
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Delegate to service layer for business logic
    const stats = await jobsService.getStats(userId);
    res.json(stats);
  } catch (err: any) {
    logControllerError("getJobPostStats", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to fetch stats."),
    });
  }
};


// ─── GET /api/employer/job-posts ──────────────────────────────────────────────
//
// Returns a paginated, filterable list of the employer's job posts.
//
// Query params:
//   status  - optional: DRAFT | ACTIVE | CLOSED
//   type    - optional: JOB | INTERNSHIP
//   search  - optional: search by title
//   page    - optional: page number (default: 1)
//   limit   - optional: records per page (default: 20)
//
// Response: { data: JobPostDTO[], pagination: { total, page, limit, totalPages } }
// IMPORTANT: Only returns posts owned by the requesting employer.
// Pagination prevents loading too many records at once.

export const getJobPosts = async (req: Request, res: Response) => {
  try {
    // Verify user is authenticated
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Validate and parse query parameters using Zod schema for type safety
    const queryResult = jobPostQuerySchema.safeParse(req.query);
    if (!queryResult.success) {
      return res.status(400).json({
        message: "Invalid query parameters",
        errors: queryResult.error.flatten().fieldErrors,
      });
    }

    // Call service to fetch filtered, paginated results
    const result = await jobsService.getJobPosts(userId, queryResult.data);
    res.json(result);
  } catch (err: any) {
    logControllerError("getJobPosts", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to fetch job posts."),
    });
  }
};


// ─── GET /api/employer/job-posts/:id ─────────────────────────────────────────
//
// Returns a single job post by ID.
// Only returns the post if it belongs to the requesting employer.
//
// Route params:
//   id - UUID of the job post
//
// Response: JobPostDTO
// Errors:   404 if not found or not owned by this employer
// IMPORTANT: Ownership check prevents employers from accessing other's posts.

export const getJobPostById = async (req: Request, res: Response) => {
  try {
    // Verify user is authenticated
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Extract post ID from URL parameter
    const postIdParam = req.params.id;
    const postId = Array.isArray(postIdParam) ? postIdParam[0] : postIdParam;
    if (!postId) return res.status(400).json({ message: "Job post ID is required" });

    // Service validates ownership before returning
    const post = await jobsService.getJobPostById(userId, postId);
    res.json(post);
  } catch (err: any) {
    logControllerError("getJobPostById", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to fetch job post."),
    });
  }
};


// ─── POST /api/employer/job-posts ─────────────────────────────────────────────
//
// Create a new job post. Defaults to DRAFT status.
//
// Request body (JSON):
//   title*       - string
//   type*        - "JOB" | "INTERNSHIP"
//   description  - string (optional)
//   requirements - string (optional)
//   location     - string (optional)
//   closingDate  - ISO date string (optional)
//   status       - "DRAFT" | "ACTIVE" (optional, default: "DRAFT")
//
// Response: 201 + JobPostDTO
// Errors:   400 if validation fails | 403 if not approved employer
// IMPORTANT: Only approved employers can create job posts.
// New posts start as DRAFT and can be activated later.

export const createJobPost = async (req: Request, res: Response) => {
  try {
    // Verify user is authenticated
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Validate request body with Zod schema — ensures type safety
    const bodyResult = createJobPostSchema.safeParse(req.body);
    if (!bodyResult.success) {
      // Log validation errors for debugging
      console.error("Job post validation failed:", JSON.stringify(bodyResult.error.flatten().fieldErrors, null, 2));
      return res.status(400).json({
        message: "Validation failed",
        // flatten() gives a clean { fieldName: [errorMessages] } object
        errors: bodyResult.error.flatten().fieldErrors,
      });
    }

    // Service creates the post and checks employer approval status
    const post = await jobsService.createJobPost(userId, bodyResult.data);
    // 201 Created — standard HTTP status for successful resource creation
    res.status(201).json(post);
  } catch (err: any) {
    logControllerError("createJobPost", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to create job post."),
    });
  }
};


// ─── PATCH /api/employer/job-posts/:id ───────────────────────────────────────
//
// Partially update an existing job post.
// Only updates fields that are provided in the request body.
//
// Route params:
//   id - UUID of the job post
//
// Request body: any subset of job post fields (all optional)
//
// Response: updated JobPostDTO
// Errors:   400 validation | 403 not approved | 404 not found / not owned
// IMPORTANT: Only the owner (employer who created it) can update it.
// Uses PATCH (not PUT), so only changed fields need to be sent.

export const updateJobPost = async (req: Request, res: Response) => {
  try {
    // Verify user is authenticated
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Extract post ID from URL parameter
    const postIdParam = req.params.id;
    const postId = Array.isArray(postIdParam) ? postIdParam[0] : postIdParam;
    if (!postId) return res.status(400).json({ message: "Job post ID is required" });

    // Validate request body — all fields optional for partial update
    const bodyResult = updateJobPostSchema.safeParse(req.body);
    if (!bodyResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: bodyResult.error.flatten().fieldErrors,
      });
    }

    // Service updates post and checks ownership
    const updated = await jobsService.updateJobPost(userId, postId, bodyResult.data);
    res.json(updated);
  } catch (err: any) {
    logControllerError("updateJobPost", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to update job post."),
    });
  }
};


// ─── DELETE /api/employer/job-posts/:id ──────────────────────────────────────
//
// Permanently delete a job post.
// Only the owning employer can delete their own posts.
//
// Route params:
//   id - UUID of the job post
//
// Response: { message: "Job post deleted successfully." }
// Errors:   403 not approved | 404 not found / not owned
// IMPORTANT: This is a permanent operation — deleted posts cannot be recovered.

export const deleteJobPost = async (req: Request, res: Response) => {
  try {
    // Verify user is authenticated
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Extract and validate post ID from URL parameter
    const postIdParam = req.params.id;
    const postId = Array.isArray(postIdParam) ? postIdParam[0] : postIdParam;
    if (!postId) return res.status(400).json({ message: "Job post ID is required" });
    if (!isUuid(postId)) return res.status(400).json({ message: "Invalid job post ID format" });

    // Service deletes post after ownership verification
    await jobsService.deleteJobPost(userId, postId);
    res.json({ message: "Job post deleted successfully." });
  } catch (err: any) {
    logControllerError("deleteJobPost", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to delete job post."),
    });
  }
};

/**
 * GET /api/employer/job-posts/:id/applications?status=PENDING
 * Returns all candidates who applied for a specific job post.
 * Optionally filters by application status (PENDING, SHORTLISTED, REJECTED).
 */
export const getJobPostApplications = async (req: Request, res: Response) => {
  try {
    // Verify user is authenticated
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Extract and validate job post ID
    const jobPostIdParam = req.params.id;
    const jobPostId = Array.isArray(jobPostIdParam) ? jobPostIdParam[0] : jobPostIdParam;
    if (!jobPostId) return res.status(400).json({ message: "Job post ID is required" });
    if (!isUuid(jobPostId)) return res.status(400).json({ message: "Invalid job post ID format" });

    // Optional status filter
    const status = req.query.status ? String(req.query.status) : undefined;

    // Fetch applications from service
    const applications = await jobsService.getApplicationsByJobPost(userId, jobPostId, status);
    res.json(applications);
  } catch (err: any) {
    logControllerError("getJobPostApplications", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to fetch applications."),
    });
  }
};

/**
 * POST /api/employer/job-posts/:jobPostId/applications/:candidateProfileId/reviewed
 * Employer marks they have reviewed the candidate (sets isReviewed = true).
 * Independent from shortlisting.
 */
export const markReviewed = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const jobPostId = String(req.params.jobPostId);
    const candidateProfileId = String(req.params.candidateProfileId);
    if (!jobPostId || !isUuid(jobPostId))
      return res.status(400).json({ message: "Invalid job post ID" });
    if (!candidateProfileId || !isUuid(candidateProfileId))
      return res.status(400).json({ message: "Invalid candidate profile ID" });

    const result = await jobsService.markReviewed(userId, jobPostId, candidateProfileId);
    res.json(result);
  } catch (err: any) {
    logControllerError("markReviewed", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to mark as reviewed."),
    });
  }
};

/**
 * POST /api/employer/job-posts/:jobPostId/applications/:candidateProfileId/shortlisted
 * Employer shortlists the candidate (sets isShortlisted = true, applicationStatus = SHORTLISTED).
 * Independent from reviewed.
 */
export const markShortlisted = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const jobPostId = String(req.params.jobPostId);
    const candidateProfileId = String(req.params.candidateProfileId);
    if (!jobPostId || !isUuid(jobPostId))
      return res.status(400).json({ message: "Invalid job post ID" });
    if (!candidateProfileId || !isUuid(candidateProfileId))
      return res.status(400).json({ message: "Invalid candidate profile ID" });

    const result = await jobsService.markShortlisted(userId, jobPostId, candidateProfileId);
    res.json(result);
  } catch (err: any) {
    logControllerError("markShortlisted", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to shortlist candidate."),
    });
  }
};
