"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const interviews_controller_1 = require("./interviews.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)(["STUDENT", "PROFESSIONAL"]));
// GET /api/candidate/interviews/scheduled-dates?year=2026&month=4
router.get("/scheduled-dates", interviews_controller_1.getCandidateInterviewDates);
// GET /api/candidate/interviews
router.get("/", interviews_controller_1.getCandidateInterviews);
// GET /api/candidate/interviews/:interviewId
router.get("/:interviewId", interviews_controller_1.getCandidateInterviewById);
exports.default = router;
//# sourceMappingURL=interviews.routes.js.map