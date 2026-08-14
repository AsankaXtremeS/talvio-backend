import { Request, Response } from "express";
/**
 * GET /api/employer/interviews
 * List all interviews for the authenticated employer.
 */
export declare const listInterviews: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/employer/interviews/scheduled-dates
 * Returns array of date strings ("YYYY-MM-DD") that have interviews.
 * Used to render dots on the calendar.
 * Query params: year, month (both required, 1-based month)
 */
export declare const getScheduledDates: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/employer/interviews/:id
 * Get a single interview by ID.
 */
export declare const getInterview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/employer/interviews
 * Create a draft interview.
 * For ONLINE meetings, creates a Google Calendar event and returns a Meet link.
 */
export declare const createInterview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/employer/interviews/:id
 * Update a draft interview (date, time, type, notes, etc.).
 */
export declare const updateInterview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/employer/interviews/generate-email
 * Generate and return an email preview (HTML body + subject).
 * Does NOT save or send — purely for preview display.
 */
export declare const generateEmailPreview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/employer/interviews/:id/schedule
 * Confirm the interview and send the invitation email.
 * Changes status DRAFT → SCHEDULED.
 */
export declare const scheduleAndSend: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * PATCH /api/employer/interviews/:id/email-body
 * Save the employer's custom email body text.
 */
export declare const saveEmailBody: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * DELETE /api/employer/interviews/:id
 * Cancel and delete an interview.
 * Also removes the associated Google Calendar event.
 */
export declare const cancelInterview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/employer/interviews/:id/generate-cancel-email
 * Generate a cancellation email preview.
 * Returns EmailPreviewDTO { subject, body }.
 */
export declare const generateCancelEmailPreview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * POST /api/employer/interviews/:id/cancel-and-send
 * Cancel interview and send cancellation email to candidate.
 * Changes status SCHEDULED → CANCELLED.
 * Removes Google Calendar event.
 * Returns updated InterviewDTO.
 */
export declare const cancelAndSendEmail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
/**
 * GET /api/employer/interviews/candidates/:candidateProfileId
 * Fetch candidate profile details for schedule UI.
 */
export declare const getCandidateProfile: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=interview.controller.d.ts.map