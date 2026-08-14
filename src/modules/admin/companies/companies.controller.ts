// Admin company controller.
//
// Parses HTTP requests, invokes the service layer, and returns JSON.
// Business logic belongs in services.
//
// Error handling:
// - Known service errors may include `statusCode`.
// - Unknown errors default to 500.

import { Request, Response } from "express";
import { companiesService } from "./companies.service";

type CompanyIdParams = { id: string };


// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve HTTP status code from a service error.
 * Falls back to 500 for unknown errors.
 */
const resolveStatusCode = (err: any): number => {
  if (typeof err?.statusCode === "number") return err.statusCode;
  return 500;
};


// ─── GET /admin/companies ─────────────────────────────────────────────────────
//
// List approved companies with optional search and pagination.
//
// Query params:
//   search - optional name or email filter
//   page   - optional page number (default: 1)
//   limit  - optional page size (default: 20, max: 100)

export const getCompanies = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const rawPage = Number(req.query.page);
    const rawLimit = Number(req.query.limit);
    const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 20;

    const result = await companiesService.getCompanies({ search, page, limit });
    res.json(result);
  } catch (err: any) {
    console.error("getCompanies error:", err);
    res.status(resolveStatusCode(err)).json({ message: "Failed to fetch companies." });
  }
};


// ─── GET /admin/companies/:id ─────────────────────────────────────────────────
//
// Retrieve a single approved company by UUID.

export const getCompanyById = async (req: Request<CompanyIdParams>, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: "Company ID is required." });
    }
    const company = await companiesService.getCompanyById(id);
    res.json(company);
  } catch (err: any) {
    console.error("getCompanyById error:", err);
    res.status(resolveStatusCode(err)).json({ message: err.message || "Failed to fetch company." });
  }
};


// ─── DELETE /admin/companies/:id ─────────────────────────────────────────────
//
// Delete an approved employer company and related records.

export const deleteCompany = async (req: Request<CompanyIdParams>, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ message: "Company ID is required." });
    }
    await companiesService.deleteCompany(id);
    res.json({ message: "Company removed successfully." });
  } catch (err: any) {
    console.error("deleteCompany error:", err);
    res.status(resolveStatusCode(err)).json({ message: err.message || "Failed to remove company." });
  }
};