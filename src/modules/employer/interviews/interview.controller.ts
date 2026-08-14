import { Request, Response } from "express";
import { interviewService } from "./interview.service";
import {
  createInterviewSchema,
  updateInterviewSchema,
  generateEmailSchema,
  interviewQuerySchema,
} from "./interview.validation";

//helping functions
const resolveStatusCode = (err: any): number => {
  if (typeof err?.statusCode === "number") return err.statusCode;
  return 500;
};

const getEmployerId = (req: any): string | null => {
  return req.user?.id ?? req.user?.userId ?? null;
};

const getParamAsString = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
};

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};


 //format Zod validation errors into a clean error response

const formatValidationError = (zodError: any) => {
  const flattened = zodError.flatten();
  return {
    message: "Validation failed",
    errors: {
      formErrors: flattened.formErrors,
      fieldErrors: flattened.fieldErrors,
    },
  };
};

// ─── Controllers 


 //list all interviews for the authenticated employer.
 
export const listInterviews = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    // Validate and parse query params
    const parseResult = interviewQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json(formatValidationError(parseResult.error));
    }

    const result = await interviewService.list(employerId, parseResult.data);
    return res.json(result);
  } catch (err) {
    console.error("listInterviews error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};


export const getScheduledDates = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    const year = parseInt(req.query.year as string, 10);
    const month = parseInt(req.query.month as string, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "year and month are required (month is 1-12)" });
    }

    const dates = await interviewService.getScheduledDates(employerId, year, month);
    return res.json({ dates });
  } catch (err) {
    console.error("getScheduledDates error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};

 //get a single interview by ID.
export const getInterview = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    const id = getParamAsString(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid interview id" });

    const interview = await interviewService.getById(id, employerId);
    console.log(`[getInterview] ID: ${id}, MeetingType: ${interview.meetingType}, MeetingLink: ${interview.meetingLink}`);
    return res.json(interview);
  } catch (err) {
    console.error("getInterview error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};


 //for ONLINE meetings, creates a Google Calendar event and returns a Meet link.

export const createInterview = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    console.log("[createInterview] Received payload:", JSON.stringify(req.body, null, 2));

    const parseResult = createInterviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorResponse = formatValidationError(parseResult.error);
      console.log("[createInterview] Validation failed:", JSON.stringify(errorResponse, null, 2));
      return res.status(400).json(errorResponse);
    }

    const interview = await interviewService.createDraft(employerId, parseResult.data);
    console.log("[createInterview] Interview created successfully:", interview.id);
    return res.status(201).json(interview);
  } catch (err) {
    console.error("createInterview error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};

/**
 * Update a draft interview (date, time, type, notes, etc.).
 */
export const updateInterview = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    const id = getParamAsString(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid interview id" });

    const parseResult = updateInterviewSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(formatValidationError(parseResult.error));
    }

    const interview = await interviewService.updateDraft(id, employerId, parseResult.data);
    return res.json(interview);
  } catch (err) {
    console.error("updateInterview error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};

/**
 * Generate and return an email preview (HTML body + subject).
 * Does NOT save or send — purely for preview display.
 */
export const generateEmailPreview = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    const parseResult = generateEmailSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(formatValidationError(parseResult.error));
    }

    const preview = await interviewService.generateEmailPreview(employerId, parseResult.data);
    return res.json(preview);
  } catch (err) {
    console.error("generateEmailPreview error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};


 //confirm the interview and send the invitation email,Changes status DRAFT → SCHEDULED.
 
export const scheduleAndSend = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    const id = getParamAsString(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid interview id" });

    const interview = await interviewService.scheduleAndSend(id, employerId);
    return res.json(interview);
  } catch (err) {
    console.error("scheduleAndSend error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};

/**
 * PATCH /api/employer/interviews/:id/email-body
 * Save the employer's custom email body text.
 */
export const saveEmailBody = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    const id = getParamAsString(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid interview id" });

    const { emailBody } = req.body;

    if (typeof emailBody !== "string") {
      return res.status(400).json({ message: "emailBody must be a string" });
    }

    const interview = await interviewService.saveEmailBody(id, employerId, emailBody);
    return res.json(interview);
  } catch (err) {
    console.error("saveEmailBody error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};


 //Cancel and delete an interview,Also removes the associated Google Calendar event.
 
export const cancelInterview = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    const id = getParamAsString(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid interview id" });

    await interviewService.cancel(id, employerId);
    return res.status(204).send();
  } catch (err) {
    console.error("cancelInterview error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};

/**
 * POST /api/employer/interviews/:id/generate-cancel-email
 * Generate a cancellation email preview.
 * Returns EmailPreviewDTO { subject, body }.
 */
export const generateCancelEmailPreview = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    const id = getParamAsString(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid interview id" });

    const { reason } = req.body;
    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ message: "reason is required" });
    }

    const preview = await interviewService.generateCancelEmailPreview(id, employerId, reason);
    return res.json(preview);
  } catch (err) {
    console.error("generateCancelEmailPreview error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};

/**
 * POST /api/employer/interviews/:id/cancel-and-send
 * Cancel interview and send cancellation email to candidate.
 * Changes status SCHEDULED → CANCELLED.
 * Removes Google Calendar event.
 */
export const cancelAndSendEmail = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    const id = getParamAsString(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid interview id" });

    const { reason, emailBody } = req.body;
    if (typeof reason !== "string" || !reason.trim()) {
      return res.status(400).json({ message: "reason is required" });
    }
    if (typeof emailBody !== "string") {
      return res.status(400).json({ message: "emailBody must be a string" });
    }

    const interview = await interviewService.cancelAndSendEmail(id, employerId, reason, emailBody);
    return res.json(interview);
  } catch (err) {
    console.error("cancelAndSendEmail error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};

/**
 * GET /api/employer/interviews/candidates/:candidateProfileId
 * Fetch candidate profile details for schedule UI.
 */
export const getCandidateProfile = async (req: Request, res: Response) => {
  try {
    const employerId = getEmployerId(req);
    if (!employerId) return res.status(401).json({ message: "Unauthorized" });

    const candidateProfileId = getParamAsString(req.params.candidateProfileId);
    if (!candidateProfileId) {
      return res.status(400).json({ message: "Invalid candidate profile id" });
    }
    if (!isUuid(candidateProfileId)) {
      return res.status(400).json({ message: "Candidate profile id must be a valid UUID" });
    }

    const candidate = await interviewService.getCandidateProfile(employerId, candidateProfileId);
    return res.json(candidate);
  } catch (err) {
    console.error("getCandidateProfile error:", err);
    return res.status(resolveStatusCode(err)).json({ message: (err as Error).message });
  }
};