// Routes — admin candidates module.
// All routes require authentication + ADMIN role.

import { Router } from "express";
import { getCandidates, getCandidateById, deleteCandidate, getCandidateStats } from "./candidates.controller";
import { authenticate } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

// GET  /api/admin/candidates        — list all candidates
router.get("/", getCandidates);

// GET  /api/admin/candidates/stats  — candidates aggregate stats
router.get("/stats", getCandidateStats);

// GET  /api/admin/candidates/:id    — view one candidate profile
router.get("/:id", getCandidateById);

// DELETE /api/admin/candidates/:id  — remove a candidate
router.delete("/:id", deleteCandidate);

export default router;