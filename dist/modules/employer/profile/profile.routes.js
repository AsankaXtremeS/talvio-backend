"use strict";
// Routes for employer profile management.
//
// All routes require:
//   1. authenticate   — verifies the JWT and sets req.user
//   2. requireRole    — ensures the user is an EMPLOYER (not a candidate or admin)
//
// There is no :userId in these routes — the profile is always the
// authenticated user's own profile, resolved from the JWT.
// This eliminates the entire class of IDOR (Insecure Direct Object Reference)
// vulnerabilities that would arise from /api/employer/profile/:userId patterns.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const profile_controller_1 = require("./profile.controller");
const router = (0, express_1.Router)();
// Apply authentication and role check to every route in this file.
router.use(auth_middleware_1.authenticate);
router.use((0, role_middleware_1.requireRole)("EMPLOYER"));
// GET  /api/employer/profile  — read the authenticated employer's own profile
router.get("/", profile_controller_1.getProfile);
// PATCH /api/employer/profile — update the authenticated employer's own profile
router.patch("/", profile_controller_1.updateProfile);
// Google Calendar OAuth routes
router.get("/calendar/auth-url", profile_controller_1.getCalendarAuthUrl);
router.post("/calendar/connect", profile_controller_1.connectCalendar);
router.post("/calendar/disconnect", profile_controller_1.disconnectCalendar);
exports.default = router;
//# sourceMappingURL=profile.routes.js.map