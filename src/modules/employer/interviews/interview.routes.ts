import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";
import {
  listInterviews,
  getScheduledDates,
  getInterview,
  getCandidateProfile,
  createInterview,
  updateInterview,
  generateEmailPreview,
  scheduleAndSend,
  saveEmailBody,
  cancelInterview,
  generateCancelEmailPreview,
  cancelAndSendEmail,
} from "./interview.controller";

const router = Router();

// Only EMPLOYER role can access interview scheduling endpoints.
router.use(authenticate, requireRole("EMPLOYER"));

// Returns array of "YYYY-MM-DD" strings for calendar dot indicators.
router.get("/scheduled-dates", getScheduledDates);

// Generate an email preview based on form data (no DB write).
router.post("/generate-email", generateEmailPreview);

// Returns minimal candidate profile details for schedule UI.
router.get("/candidates/:candidateProfileId", getCandidateProfile);

// GET  /api/employer/interviews           List all interviews (paginated)
// POST /api/employer/interviews           Create a draft interview
router.get("/", listInterviews);
router.post("/", createInterview);

// GET    /api/employer/interviews/:id              — Get single interview
// PATCH  /api/employer/interviews/:id              — Update draft fields
// DELETE /api/employer/interviews/:id              — Cancel + delete interview
router.get("/:id", getInterview);
router.patch("/:id", updateInterview);
router.delete("/:id", cancelInterview);

// POST  /api/employer/interviews/:id/schedule      — Confirm + send email
router.post("/:id/schedule", scheduleAndSend);

// PATCH /api/employer/interviews/:id/email-body    — Save custom email body
router.patch("/:id/email-body", saveEmailBody);

// POST  /api/employer/interviews/:id/generate-cancel-email  — Generate cancellation email preview
router.post("/:id/generate-cancel-email", generateCancelEmailPreview);

// POST  /api/employer/interviews/:id/cancel-and-send        — Cancel interview + send email
router.post("/:id/cancel-and-send", cancelAndSendEmail);

export default router;