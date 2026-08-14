// Route definitions for employer job post management.
//
// All routes in this file are:
//   1. Protected by `authenticate`       — user must be logged in (valid JWT)
//   2. Protected by `requireRole`        — user must have the EMPLOYER role
//
// Base path (mounted in routes.ts): /api/employer/job-posts
//
// Pattern followed from: src/modules/admin/companies/companies.routes.ts

import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";
import {
  getJobPostStats,
  getJobPosts,
  getJobPostById,
  createJobPost,
  updateJobPost,
  deleteJobPost,
  getJobPostApplications,
  markReviewed,
  markShortlisted,
} from "./jobPosts.controller";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// APPLY AUTH + ROLE GUARDS TO ALL ROUTES
// ═══════════════════════════════════════════════════════════════════════════════
// Apply auth + role guard to EVERY route in this file.
// Doing it once here (rather than per-route) ensures no route is
// accidentally left unprotected.
//
// SECURITY: Only users with role=EMPLOYER can access these routes.
// Even if an ADMIN or STUDENT has a valid JWT, they will get 403.
router.use(authenticate, requireRole("EMPLOYER"));

// ═══════════════════════════════════════════════════════════════════════════════
// STATS ENDPOINT — Must be registered BEFORE /:id pattern
// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTANT: /stats must be registered BEFORE /:id
// Otherwise Express will match "stats" as an :id parameter value.

// GET /api/employer/job-posts/stats
// Returns: { total, active, draft, closed } counts for dashboard cards
// Used to populate the stats cards at the top of the Job Posts page.
router.get("/stats", getJobPostStats);

// ═══════════════════════════════════════════════════════════════════════════════
// JOB POST CRUD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// GET    /api/employer/job-posts          — List all posts (paginated, filterable)
// POST   /api/employer/job-posts          — Create a new job post
// Returns paginated list with filtering by status/type and text search.
router.get("/", getJobPosts);
router.post("/", createJobPost);

// GET    /api/employer/job-posts/:id/applications — Get all candidates who applied to this post
// IMPORTANT: Must be registered BEFORE /:id route to avoid matching "applications" as an :id
// Optional query param: ?status=PENDING|SHORTLISTED|REJECTED
router.get("/:id/applications", getJobPostApplications);

// POST /api/employer/job-posts/:jobPostId/applications/:candidateProfileId/reviewed
// Employer marks the candidate's application as reviewed (isReviewed = true).
router.post("/:jobPostId/applications/:candidateProfileId/reviewed", markReviewed);

// POST /api/employer/job-posts/:jobPostId/applications/:candidateProfileId/shortlisted
// Employer shortlists the candidate (isShortlisted = true, applicationStatus = SHORTLISTED).
router.post("/:jobPostId/applications/:candidateProfileId/shortlisted", markShortlisted);

// GET    /api/employer/job-posts/:id      — Get a single post by ID
// PATCH  /api/employer/job-posts/:id      — Partially update a post (including status changes)
// DELETE /api/employer/job-posts/:id      — Delete a post permanently
// All operations include ownership verification in the service layer.
router.get("/:id", getJobPostById);
router.patch("/:id", updateJobPost);  // PATCH not PUT — for partial updates
router.delete("/:id", deleteJobPost);

export default router;
