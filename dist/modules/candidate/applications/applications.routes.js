"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const applications_controller_1 = require("./applications.controller");
const router = (0, express_1.Router)();
// GET /api/candidate/applications
router.get("/", auth_middleware_1.authenticate, applications_controller_1.getApplications);
// GET /api/candidate/applications/stats
router.get("/stats", auth_middleware_1.authenticate, applications_controller_1.getStats);
// GET /api/candidate/applications/:applicationId (with status history)
router.get("/:applicationId", auth_middleware_1.authenticate, applications_controller_1.getApplicationWithHistory);
// POST /api/candidate/applications/apply/:jobPostId
router.post("/apply/:jobPostId", auth_middleware_1.authenticate, applications_controller_1.applyForJob);
// DELETE /api/candidate/applications/withdraw/:applicationId
router.delete("/withdraw/:applicationId", auth_middleware_1.authenticate, applications_controller_1.withdrawApplication);
exports.default = router;
//# sourceMappingURL=applications.routes.js.map