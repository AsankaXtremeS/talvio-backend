import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware";
import { 
  getApplications, 
  getStats,
  getApplicationDetail,
  applyForJob, 
  withdrawApplication,
  getApplicationWithHistory
} from "./applications.controller";

const router = Router();

// GET /api/candidate/applications
router.get("/", authenticate, getApplications);

// GET /api/candidate/applications/stats
router.get("/stats", authenticate, getStats);

// GET /api/candidate/applications/:applicationId (with status history)
router.get("/:applicationId", authenticate, getApplicationWithHistory);

// POST /api/candidate/applications/apply/:jobPostId
router.post("/apply/:jobPostId", authenticate, applyForJob);

// DELETE /api/candidate/applications/withdraw/:applicationId
router.delete("/withdraw/:applicationId", authenticate, withdrawApplication);

export default router;
