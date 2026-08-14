"use strict";
// Controller layer for admin company management.
//
// A controller's only job is HTTP: read the request, call the service,
// send the response. No business logic or DB queries belong here.
//
// Error handling pattern:
//   We let service errors bubble up. Typed errors (with statusCode) are
//   surfaced with that code; anything else falls back to 500.
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompany = exports.getCompanyById = exports.getCompanies = void 0;
const companies_service_1 = require("./companies.service");
// ─── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Resolve HTTP status code from a thrown error.
 * Services attach a `statusCode` property for known error cases (e.g. 404).
 */
const resolveStatusCode = (err) => {
    if (typeof err?.statusCode === "number")
        return err.statusCode;
    return 500;
};
// ─── GET /admin/companies ─────────────────────────────────────────────────────
//
// Returns a paginated list of all approved companies.
//
// Query params:
//   search  - optional string, filters by company name or email
//   page    - optional number (default: 1)
//   limit   - optional number (default: 20, max: 100)
//
// Response: { data: CompanyDTO[], pagination: { total, page, limit, totalPages } }
const getCompanies = async (req, res) => {
    try {
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const rawPage = Number(req.query.page);
        const rawLimit = Number(req.query.limit);
        const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
        const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 20;
        const result = await companies_service_1.companiesService.getCompanies({ search, page, limit });
        res.json(result);
    }
    catch (err) {
        console.error("getCompanies error:", err);
        res.status(resolveStatusCode(err)).json({ message: "Failed to fetch companies." });
    }
};
exports.getCompanies = getCompanies;
// ─── GET /admin/companies/:id ─────────────────────────────────────────────────
//
// Returns the profile of a single approved company by user ID.
// Used by the "View" button on the Companies list page.
//
// Route params:
//   id  - the user's UUID
//
// Response: CompanyDTO
// Errors:   404 if no approved company found with that ID
const getCompanyById = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "Company ID is required." });
        }
        const company = await companies_service_1.companiesService.getCompanyById(id);
        res.json(company);
    }
    catch (err) {
        console.error("getCompanyById error:", err);
        res.status(resolveStatusCode(err)).json({ message: err.message || "Failed to fetch company." });
    }
};
exports.getCompanyById = getCompanyById;
// ─── DELETE /admin/companies/:id ─────────────────────────────────────────────
//
// Permanently removes a company (the employer user and all related records).
// Only approved employer accounts can be deleted via this endpoint.
//
// Route params:
//   id  - the user's UUID
//
// Response: { message: "Company removed successfully." }
// Errors:   404 if not found or not an approved employer
const deleteCompany = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json({ message: "Company ID is required." });
        }
        await companies_service_1.companiesService.deleteCompany(id);
        res.json({ message: "Company removed successfully." });
    }
    catch (err) {
        console.error("deleteCompany error:", err);
        res.status(resolveStatusCode(err)).json({ message: err.message || "Failed to remove company." });
    }
};
exports.deleteCompany = deleteCompany;
//# sourceMappingURL=companies.controller.js.map