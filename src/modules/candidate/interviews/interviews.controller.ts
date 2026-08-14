import { Request, Response } from "express";
import { candidateInterviewsService } from "./interviews.service";

type InterviewStatusValue = "DRAFT" | "SCHEDULED" | "CANCELLED" | "COMPLETED";

const statusValues: InterviewStatusValue[] = ["DRAFT", "SCHEDULED", "CANCELLED", "COMPLETED"];

const resolveErrorStatus = (error: unknown): number => {
  const maybeStatus = (error as { statusCode?: number })?.statusCode;
  return typeof maybeStatus === "number" ? maybeStatus : 500;
};

const parsePagination = (req: Request) => {
  const pageRaw = Number(req.query.page ?? 1);
  const limitRaw = Number(req.query.limit ?? 20);

  const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;

  return { page, limit };
};

const parseStatus = (req: Request): InterviewStatusValue | undefined => {
  const raw = typeof req.query.status === "string" ? req.query.status.toUpperCase() : "";
  if (!raw) return "SCHEDULED";
  if (raw === "ALL") return undefined;
  return statusValues.includes(raw as InterviewStatusValue) ? (raw as InterviewStatusValue) : "SCHEDULED";
};

const getParamAsString = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
};

export const getCandidateInterviews = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { page, limit } = parsePagination(req);
    const status = parseStatus(req);

    const result = await candidateInterviewsService.listByCandidate(userId, {
      page,
      limit,
      status,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("getCandidateInterviews error:", error);
    return res.status(resolveErrorStatus(error)).json({
      message: (error as Error).message || "Failed to fetch interviews",
    });
  }
};

export const getCandidateInterviewById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const interviewId = getParamAsString(req.params.interviewId);
    if (!interviewId) {
      return res.status(400).json({ message: "Invalid interview id" });
    }

    const interview = await candidateInterviewsService.getById(userId, interviewId);
    return res.status(200).json(interview);
  } catch (error) {
    console.error("getCandidateInterviewById error:", error);
    return res.status(resolveErrorStatus(error)).json({
      message: (error as Error).message || "Failed to fetch interview",
    });
  }
};

export const getCandidateInterviewDates = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);

    if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "year and month are required (month is 1-12)" });
    }

    const dates = await candidateInterviewsService.getScheduledDates(userId, year, month);
    return res.status(200).json({ dates });
  } catch (error) {
    console.error("getCandidateInterviewDates error:", error);
    return res.status(resolveErrorStatus(error)).json({
      message: (error as Error).message || "Failed to fetch interview dates",
    });
  }
};
