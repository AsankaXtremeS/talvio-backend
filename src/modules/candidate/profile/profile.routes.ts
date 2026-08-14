import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";
import { getProfile, updateProfile, updateResume, removeResume } from "./profile.controller";

const router = Router();

// Get candidate profile
// GET /api/candidate/profile
router.get(
  "/",
  authenticate,
  requireRole(["STUDENT", "PROFESSIONAL"]),
  getProfile
);

router.put(
  "/",
  authenticate,
  requireRole(["STUDENT", "PROFESSIONAL"]),
  updateProfile
);

// Update default resume
// POST /api/candidate/profile/resume
router.post(
  "/resume",
  authenticate,
  requireRole(["STUDENT", "PROFESSIONAL"]),
  updateResume
);

// Remove default resume
// DELETE /api/candidate/profile/resume
router.delete(
  "/resume",
  authenticate,
  requireRole(["STUDENT", "PROFESSIONAL"]),
  removeResume
);

export default router;
