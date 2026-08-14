import { Router } from "express";
import { getJobs, getNewJobs } from "./jobs.controller";
import { authenticate } from "../../../middlewares/auth.middleware";

const router = Router();

// GET /api/candidate/jobs
// Protected route - only logged in candidates can access
router.get("/", authenticate, getJobs);
router.get("/new", authenticate, getNewJobs);

export default router;