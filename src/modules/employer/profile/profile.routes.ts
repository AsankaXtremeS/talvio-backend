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

import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";
import { getProfile, updateProfile, getCalendarAuthUrl, connectCalendar, disconnectCalendar, microsoftCalendarCallback } from "./profile.controller";

const router = Router();

// Apply authentication and role check to every route in this file.
router.use(authenticate);
router.use(requireRole("EMPLOYER"));

// GET  /api/employer/profile  — read the authenticated employer's own profile
router.get("/", getProfile);

// PATCH /api/employer/profile — update the authenticated employer's own profile
router.patch("/", updateProfile);

// Google Calendar OAuth routes
router.get("/calendar/auth-url", getCalendarAuthUrl);
router.post("/calendar/connect", connectCalendar);
router.post("/calendar/disconnect", disconnectCalendar);

export default router;