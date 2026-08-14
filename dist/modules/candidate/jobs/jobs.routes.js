"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jobs_controller_1 = require("./jobs.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/candidate/jobs
// Protected route - only logged in candidates can access
router.get("/", auth_middleware_1.authenticate, jobs_controller_1.getJobs);
router.get("/new", auth_middleware_1.authenticate, jobs_controller_1.getNewJobs);
exports.default = router;
//# sourceMappingURL=jobs.routes.js.map