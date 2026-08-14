"use strict";
// Controller — handles HTTP for the candidates module.
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCandidate = exports.getCandidateById = exports.getCandidates = exports.getCandidateStats = void 0;
const candidates_service_1 = require("./candidates.service");
const resolveStatusCode = (err) => typeof err?.statusCode === "number" ? err.statusCode : 500;
const getParamAsString = (value) => Array.isArray(value) ? value[0] : value ?? "";
// GET /api/admin/candidates/stats
const getCandidateStats = async (_req, res) => {
    try {
        const result = await candidates_service_1.candidatesService.getCandidateStats();
        res.json(result);
    }
    catch (err) {
        console.error("getCandidateStats error:", err);
        res.status(resolveStatusCode(err)).json({ message: "Failed to fetch candidate stats." });
    }
};
exports.getCandidateStats = getCandidateStats;
// GET /api/admin/candidates
// Query: ?search=, ?role=STUDENT|PROFESSIONAL, ?page=, ?limit=
const getCandidates = async (req, res) => {
    try {
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const role = req.query.role === "STUDENT" || req.query.role === "PROFESSIONAL"
            ? req.query.role
            : undefined;
        const page = parseInt(String(req.query.page || "1"), 10);
        const limit = parseInt(String(req.query.limit || "20"), 10);
        const result = await candidates_service_1.candidatesService.getCandidates({ search, role, page, limit });
        res.json(result);
    }
    catch (err) {
        console.error("getCandidates error:", err);
        res.status(resolveStatusCode(err)).json({ message: "Failed to fetch candidates." });
    }
};
exports.getCandidates = getCandidates;
// GET /api/admin/candidates/:id
const getCandidateById = async (req, res) => {
    try {
        const id = getParamAsString(req.params.id);
        const candidate = await candidates_service_1.candidatesService.getCandidateById(id);
        res.json(candidate);
    }
    catch (err) {
        console.error("getCandidateById error:", err);
        res.status(resolveStatusCode(err)).json({ message: err.message || "Failed to fetch candidate." });
    }
};
exports.getCandidateById = getCandidateById;
// DELETE /api/admin/candidates/:id
const deleteCandidate = async (req, res) => {
    try {
        const id = getParamAsString(req.params.id);
        await candidates_service_1.candidatesService.deleteCandidate(id);
        res.json({ message: "Candidate removed successfully." });
    }
    catch (err) {
        console.error("deleteCandidate error:", err);
        res.status(resolveStatusCode(err)).json({ message: err.message || "Failed to remove candidate." });
    }
};
exports.deleteCandidate = deleteCandidate;
//# sourceMappingURL=candidates.controller.js.map