"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const profile_controller_1 = require("./profile.controller");
const router = (0, express_1.Router)();
// Get candidate profile
// GET /api/candidate/profile
router.get("/", auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(["STUDENT", "PROFESSIONAL"]), profile_controller_1.getProfile);
router.put("/", auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(["STUDENT", "PROFESSIONAL"]), profile_controller_1.updateProfile);
// Update default resume
// POST /api/candidate/profile/resume
router.post("/resume", auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(["STUDENT", "PROFESSIONAL"]), profile_controller_1.updateResume);
// Remove default resume
// DELETE /api/candidate/profile/resume
router.delete("/resume", auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(["STUDENT", "PROFESSIONAL"]), profile_controller_1.removeResume);
exports.default = router;
//# sourceMappingURL=profile.routes.js.map