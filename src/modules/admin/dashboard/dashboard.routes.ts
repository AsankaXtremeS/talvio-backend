import { Router } from "express";
import { getDashboardOverview } from "./dashboard.controller";
import { authenticate } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

// GET /api/admin/dashboard/overview
router.get("/overview", getDashboardOverview);

export default router;
