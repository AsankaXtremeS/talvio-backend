"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jobpost_controller_1 = require("./jobpost.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)("ADMIN"));
router.get("/", jobpost_controller_1.getJobPosts);
router.get("/stats", jobpost_controller_1.getJobPostStats);
router.get("/:id", jobpost_controller_1.getJobPostById);
router.delete("/:id", jobpost_controller_1.deleteJobPost);
exports.default = router;
//# sourceMappingURL=jobpost.routes.js.map