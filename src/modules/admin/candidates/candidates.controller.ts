// Controller — handles HTTP for the candidates module.

import { Request, Response } from "express";
import { candidatesService } from "./candidates.service";

const resolveStatusCode = (err: any): number =>
  typeof err?.statusCode === "number" ? err.statusCode : 500;

const getParamAsString = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? value[0] : value ?? "";

// GET /api/admin/candidates/stats
export const getCandidateStats = async (_req: Request, res: Response) => {
  try {
    const result = await candidatesService.getCandidateStats();
    res.json(result);
  } catch (err: any) {
    console.error("getCandidateStats error:", err);
    res.status(resolveStatusCode(err)).json({ message: "Failed to fetch candidate stats." });
  }
};

// GET /api/admin/candidates
// Query: ?search=, ?role=STUDENT|PROFESSIONAL, ?page=, ?limit=
export const getCandidates = async (req: Request, res: Response) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const role = req.query.role === "STUDENT" || req.query.role === "PROFESSIONAL"
      ? req.query.role
      : undefined;
    const page = parseInt(String(req.query.page || "1"), 10);
    const limit = parseInt(String(req.query.limit || "20"), 10);

    const result = await candidatesService.getCandidates({ search, role, page, limit });
    res.json(result);
  } catch (err: any) {
    console.error("getCandidates error:", err);
    res.status(resolveStatusCode(err)).json({ message: "Failed to fetch candidates." });
  }
};

// GET /api/admin/candidates/:id
export const getCandidateById = async (req: Request, res: Response) => {
  try {
    const id = getParamAsString(req.params.id);
    const candidate = await candidatesService.getCandidateById(id);
    res.json(candidate);
  } catch (err: any) {
    console.error("getCandidateById error:", err);
    res.status(resolveStatusCode(err)).json({ message: err.message || "Failed to fetch candidate." });
  }
};

// DELETE /api/admin/candidates/:id
export const deleteCandidate = async (req: Request, res: Response) => {
  try {
    const id = getParamAsString(req.params.id);
    await candidatesService.deleteCandidate(id);
    res.json({ message: "Candidate removed successfully." });
  } catch (err: any) {
    console.error("deleteCandidate error:", err);
    res.status(resolveStatusCode(err)).json({ message: err.message || "Failed to remove candidate." });
  }
};