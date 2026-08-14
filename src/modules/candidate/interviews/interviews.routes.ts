import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";
import {
  getCandidateInterviewById,
  getCandidateInterviewDates,
  getCandidateInterviews,
} from "./interviews.controller";

const router = Router();

router.use(authenticate, requireRole(["STUDENT", "PROFESSIONAL"]));

// GET /api/candidate/interviews/scheduled-dates?year=2026&month=4
router.get("/scheduled-dates", getCandidateInterviewDates);

// GET /api/candidate/interviews
router.get("/", getCandidateInterviews);

// GET /api/candidate/interviews/:interviewId
router.get("/:interviewId", getCandidateInterviewById);

export default router;
