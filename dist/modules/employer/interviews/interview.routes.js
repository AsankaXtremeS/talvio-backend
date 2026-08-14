"use strict";
// Route definitions for employer interview scheduling.
//
// All routes are protected by:
//   1. authenticate  — valid JWT required
//   2. requireRole("EMPLOYER") — only employers can access
//
// Base path (registered in routes.ts): /api/employer/interviews
//
// Route order matters:
//   - Static segments (/stats, /generate-email, /scheduled-dates) must be
//     registered BEFORE dynamic /:id segments to avoid param matching.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const interview_controller_1 = require("./interview.controller");
const router = (0, express_1.Router)();
// ─── Apply auth guard to ALL routes in this file ──────────────────────────────
// Only EMPLOYER role can access interview scheduling endpoints.
router.use(auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)("EMPLOYER"));
// ─── Static paths — must come BEFORE /:id ────────────────────────────────────
// GET  /api/employer/interviews/scheduled-dates?year=2026&month=4
// Returns array of "YYYY-MM-DD" strings for calendar dot indicators.
router.get("/scheduled-dates", interview_controller_1.getScheduledDates);
// POST /api/employer/interviews/generate-email
// Generate an email preview based on form data (no DB write).
router.post("/generate-email", interview_controller_1.generateEmailPreview);
// GET /api/employer/interviews/candidates/:candidateProfileId
// Returns minimal candidate profile details for schedule UI.
router.get("/candidates/:candidateProfileId", interview_controller_1.getCandidateProfile);
// ─── Collection routes ────────────────────────────────────────────────────────
// GET  /api/employer/interviews          — List all interviews (paginated)
// POST /api/employer/interviews          — Create a draft interview
router.get("/", interview_controller_1.listInterviews);
router.post("/", interview_controller_1.createInterview);
// ─── Single resource routes ───────────────────────────────────────────────────
// GET    /api/employer/interviews/:id              — Get single interview
// PATCH  /api/employer/interviews/:id              — Update draft fields
// DELETE /api/employer/interviews/:id              — Cancel + delete interview
router.get("/:id", interview_controller_1.getInterview);
router.patch("/:id", interview_controller_1.updateInterview);
router.delete("/:id", interview_controller_1.cancelInterview);
// POST  /api/employer/interviews/:id/schedule      — Confirm + send email
router.post("/:id/schedule", interview_controller_1.scheduleAndSend);
// PATCH /api/employer/interviews/:id/email-body    — Save custom email body
router.patch("/:id/email-body", interview_controller_1.saveEmailBody);
// POST  /api/employer/interviews/:id/generate-cancel-email  — Generate cancellation email preview
router.post("/:id/generate-cancel-email", interview_controller_1.generateCancelEmailPreview);
// POST  /api/employer/interviews/:id/cancel-and-send        — Cancel interview + send email
router.post("/:id/cancel-and-send", interview_controller_1.cancelAndSendEmail);
exports.default = router;
//# sourceMappingURL=interview.routes.js.map