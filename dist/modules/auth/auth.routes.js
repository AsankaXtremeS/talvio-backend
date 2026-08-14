"use strict";
// Express routes for authentication and user management APIs.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Rate limiter: 5 requests per minute per IP for sensitive routes
const sensitiveLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: { message: "Too many requests, please try again later." },
});
const auth_middleware_1 = require("../../middlewares/auth.middleware");
const role_middleware_1 = require("../../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.post("/register", sensitiveLimiter, auth_controller_1.registerUser);
// OAUTH routes
router.get("/oauth/:provider", auth_controller_1.oauthStart);
router.get("/oauth/:provider/callback", auth_controller_1.oauthCallback);
router.post("/register-employer", auth_controller_1.registerEmployer);
router.post("/login", sensitiveLimiter, auth_controller_1.login);
router.post("/refresh", sensitiveLimiter, auth_controller_1.refresh);
router.post("/logout", sensitiveLimiter, auth_controller_1.logout);
router.get("/me", auth_middleware_1.authenticate, auth_controller_1.me);
router.patch("/me/role", auth_middleware_1.authenticate, auth_controller_1.updateMyRole);
router.post("/forgot-password", sensitiveLimiter, auth_controller_1.forgotPassword);
router.post("/reset-password", sensitiveLimiter, auth_controller_1.resetPassword);
router.post("/approve-employer", auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)("ADMIN"), auth_controller_1.approveEmployer);
router.post("/reject-employer", auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)("ADMIN"), auth_controller_1.rejectEmployer);
router.get("/employers", auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)("ADMIN"), auth_controller_1.getEmployersByStatus);
router.get("/pending-employers", auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)("ADMIN"), auth_controller_1.getPendingEmployers);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map