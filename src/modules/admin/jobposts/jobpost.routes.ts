import { Router } from "express";
import {
	deleteJobPost,
	getJobPostById,
	getJobPosts,
	getJobPostStats,
} from "./jobpost.controller";
import { authenticate } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

router.get("/", getJobPosts);
router.get("/stats", getJobPostStats);
router.get("/:id", getJobPostById);
router.delete("/:id", deleteJobPost);

export default router;
