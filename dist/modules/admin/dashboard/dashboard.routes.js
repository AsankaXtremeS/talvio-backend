"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("./dashboard.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)("ADMIN"));
// GET /api/admin/dashboard/overview
router.get("/overview", dashboard_controller_1.getDashboardOverview);
exports.default = router;
//# sourceMappingURL=dashboard.routes.js.map