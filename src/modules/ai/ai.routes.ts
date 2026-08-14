// AI feature routes.
// All routes require authentication via the existing `authenticate` middleware.
// Role-specific restrictions use the existing `requireRole` middleware.

import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";
import {
  generateCoverLetter,
  getRecommendations,
} from "./ai.controller";

const router = Router();

// ── Candidate routes ──────────────────────────────────────────────────────────

// Get job recommendations based on CV
// GET /api/ai/recommendations
router.get(
  "/recommendations",
  authenticate,
  requireRole(["STUDENT", "PROFESSIONAL"]),
  getRecommendations
);



// Generate a tailored cover letter using AI (without submitting application)
// POST /api/ai/generate-cover-letter/:jobPostId
router.post(
  "/generate-cover-letter/:jobPostId",
  authenticate,
  requireRole(["STUDENT", "PROFESSIONAL"]),
  generateCoverLetter
);

export default router;
