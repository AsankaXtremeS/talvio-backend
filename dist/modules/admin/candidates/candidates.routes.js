"use strict";
// Routes — admin candidates module.
// All routes require authentication + ADMIN role.
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const candidates_controller_1 = require("./candidates.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)("ADMIN"));
// GET  /api/admin/candidates        — list all candidates
router.get("/", candidates_controller_1.getCandidates);
// GET  /api/admin/candidates/stats  — candidates aggregate stats
router.get("/stats", candidates_controller_1.getCandidateStats);
// GET  /api/admin/candidates/:id    — view one candidate profile
router.get("/:id", candidates_controller_1.getCandidateById);
// DELETE /api/admin/candidates/:id  — remove a candidate
router.delete("/:id", candidates_controller_1.deleteCandidate);
exports.default = router;
//# sourceMappingURL=candidates.routes.js.map