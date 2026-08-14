"use strict";
// Route definitions for admin company management.
//
// All routes in this file are:
//  1. Protected by `authenticate`  — user must be logged in (valid JWT)
//  2. Protected by `requireRole`   — user must have the ADMIN role
//
// Base path (mounted in routes.ts): /api/admin/companies
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const companies_controller_1 = require("./companies.controller");
const auth_middleware_1 = require("../../../middlewares/auth.middleware");
const role_middleware_1 = require("../../../middlewares/role.middleware");
const router = (0, express_1.Router)();
// Apply auth + role guard to every route in this module.
// Doing it once here (rather than per-route) ensures no route is accidentally left unprotected.
router.use(auth_middleware_1.authenticate, (0, role_middleware_1.requireRole)("ADMIN"));
// GET  /api/admin/companies          — list all approved companies (paginated, searchable)
router.get("/", companies_controller_1.getCompanies);
// GET  /api/admin/companies/:id      — view a single company profile
router.get("/:id", companies_controller_1.getCompanyById);
// DELETE /api/admin/companies/:id   — remove a company permanently
router.delete("/:id", companies_controller_1.deleteCompany);
exports.default = router;
//# sourceMappingURL=companies.routes.js.map