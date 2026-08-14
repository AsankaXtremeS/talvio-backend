// Express routes for authentication and user management APIs.

import { Router } from "express";
import {
  registerUser,
  registerEmployer,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  approveEmployer,
  rejectEmployer,
  getEmployersByStatus,
  getPendingEmployers,
  me,
  updateMyRole,
  // OAUTH endpoints
  oauthStart,
  oauthCallback,
} from "./auth.controller";
import rateLimit from "express-rate-limit";
// Rate limiter: 5 requests per minute per IP for sensitive routes
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { message: "Too many requests, please try again later." },
});
import { authenticate } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/role.middleware";

const router = Router();

router.post("/register", sensitiveLimiter, registerUser);
// OAUTH routes
router.get("/oauth/:provider", oauthStart);
router.get("/oauth/:provider/callback", oauthCallback);
router.post(
  "/register-employer",
  registerEmployer
);

router.post("/login", sensitiveLimiter, login);
router.post("/refresh", sensitiveLimiter, refresh);
router.post("/logout", sensitiveLimiter, logout);
router.get("/me", authenticate, me);
router.patch("/me/role", authenticate, updateMyRole);
router.post("/forgot-password", sensitiveLimiter, forgotPassword);
router.post("/reset-password", sensitiveLimiter, resetPassword);
router.post("/approve-employer", authenticate, requireRole("ADMIN"), approveEmployer);
router.post("/reject-employer", authenticate, requireRole("ADMIN"), rejectEmployer);
router.get("/employers", authenticate, requireRole("ADMIN"), getEmployersByStatus);
router.get("/pending-employers", authenticate, requireRole("ADMIN"), getPendingEmployers);

export default router;
