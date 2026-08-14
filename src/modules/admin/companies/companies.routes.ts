// Route definitions for admin company management.
//
// All routes in this file are:
//  1. Protected by `authenticate`  — user must be logged in (valid JWT)
//  2. Protected by `requireRole`   — user must have the ADMIN role
//
// Base path (mounted in routes.ts): /api/admin/companies

import { Router } from "express";
import { getCompanies, getCompanyById, deleteCompany } from "./companies.controller";
import { authenticate } from "../../../middlewares/auth.middleware";
import { requireRole } from "../../../middlewares/role.middleware";

const router = Router();

// Apply auth + role guard to every route in this module.
// Doing it once here (rather than per-route) ensures no route is accidentally left unprotected.
router.use(authenticate, requireRole("ADMIN"));

// GET  /api/admin/companies          — list all approved companies (paginated, searchable)
router.get("/", getCompanies);

// GET  /api/admin/companies/:id      — view a single company profile
router.get("/:id", getCompanyById);

// DELETE /api/admin/companies/:id   — remove a company permanently
router.delete("/:id", deleteCompany);

export default router;