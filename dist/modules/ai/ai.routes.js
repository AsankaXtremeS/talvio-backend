"use strict";
// AI feature routes.
// All routes require authentication via the existing `authenticate` middleware.
// Role-specific restrictions use the existing `requireRole` middleware.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const ai_controller_1 = require("./ai.controller");
const router = (0, express_1.Router)();
// ── Candidate routes ──────────────────────────────────────────────────────────
// Get job recommendations based on CV
// GET /api/ai/recommendations
router.get("/recommendations", auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(["STUDENT", "PROFESSIONAL"]), ai_controller_1.getRecommendations);
// Generate a tailored cover letter using AI (without submitting application)
// POST /api/ai/generate-cover-letter/:jobPostId
router.post("/generate-cover-letter/:jobPostId", auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(["STUDENT", "PROFESSIONAL"]), ai_controller_1.generateCoverLetter);
exports.default = router;
//# sourceMappingURL=ai.routes.js.map