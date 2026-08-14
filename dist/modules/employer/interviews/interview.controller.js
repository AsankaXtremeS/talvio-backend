"use strict";
// Controller layer for interview scheduling.
// ONLY handles HTTP: reads request, calls service, sends response.
// No business logic or DB queries here.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCandidateProfile = exports.cancelAndSendEmail = exports.generateCancelEmailPreview = exports.cancelInterview = exports.saveEmailBody = exports.scheduleAndSend = exports.generateEmailPreview = exports.updateInterview = exports.createInterview = exports.getInterview = exports.getScheduledDates = exports.listInterviews = void 0;
const interview_service_1 = require("./interview.service");
const interview_validation_1 = require("./interview.validation");
// ─── Helpers ──────────────────────────────────────────────────────────────────
const resolveStatusCode = (err) => {
    if (typeof err?.statusCode === "number")
        return err.statusCode;
    return 500;
};
const getEmployerId = (req) => {
    return req.user?.id ?? req.user?.userId ?? null;
};
const getParamAsString = (value) => {
    if (typeof value === "string")
        return value;
    if (Array.isArray(value) && typeof value[0] === "string")
        return value[0];
    return null;
};
const isUuid = (value) => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};
/**
 * Format Zod validation errors into a clean error response
 */
const formatValidationError = (zodError) => {
    const flattened = zodError.flatten();
    return {
        message: "Validation failed",
        errors: {
            formErrors: flattened.formErrors,
            fieldErrors: flattened.fieldErrors,
        },
    };
};
// ─── Controllers ──────────────────────────────────────────────────────────────
/**
 * GET /api/employer/interviews
 * List all interviews for the authenticated employer.
 */
const listInterviews = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        // Validate and parse query params
        const parseResult = interview_validation_1.interviewQuerySchema.safeParse(req.query);
        if (!parseResult.success) {
            return res.status(400).json(formatValidationError(parseResult.error));
        }
        const result = await interview_service_1.interviewService.list(employerId, parseResult.data);
        return res.json(result);
    }
    catch (err) {
        console.error("listInterviews error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.listInterviews = listInterviews;
/**
 * GET /api/employer/interviews/scheduled-dates
 * Returns array of date strings ("YYYY-MM-DD") that have interviews.
 * Used to render dots on the calendar.
 * Query params: year, month (both required, 1-based month)
 */
const getScheduledDates = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        const year = parseInt(req.query.year, 10);
        const month = parseInt(req.query.month, 10);
        if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
            return res.status(400).json({ message: "year and month are required (month is 1-12)" });
        }
        const dates = await interview_service_1.interviewService.getScheduledDates(employerId, year, month);
        return res.json({ dates });
    }
    catch (err) {
        console.error("getScheduledDates error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.getScheduledDates = getScheduledDates;
/**
 * GET /api/employer/interviews/:id
 * Get a single interview by ID.
 */
const getInterview = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        const id = getParamAsString(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Invalid interview id" });
        const interview = await interview_service_1.interviewService.getById(id, employerId);
        console.log(`[getInterview] ID: ${id}, MeetingType: ${interview.meetingType}, MeetingLink: ${interview.meetingLink}`);
        return res.json(interview);
    }
    catch (err) {
        console.error("getInterview error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.getInterview = getInterview;
/**
 * POST /api/employer/interviews
 * Create a draft interview.
 * For ONLINE meetings, creates a Google Calendar event and returns a Meet link.
 */
const createInterview = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        console.log("[createInterview] Received payload:", JSON.stringify(req.body, null, 2));
        const parseResult = interview_validation_1.createInterviewSchema.safeParse(req.body);
        if (!parseResult.success) {
            const errorResponse = formatValidationError(parseResult.error);
            console.log("[createInterview] Validation failed:", JSON.stringify(errorResponse, null, 2));
            return res.status(400).json(errorResponse);
        }
        const interview = await interview_service_1.interviewService.createDraft(employerId, parseResult.data);
        console.log("[createInterview] Interview created successfully:", interview.id);
        return res.status(201).json(interview);
    }
    catch (err) {
        console.error("createInterview error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.createInterview = createInterview;
/**
 * PATCH /api/employer/interviews/:id
 * Update a draft interview (date, time, type, notes, etc.).
 */
const updateInterview = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        const id = getParamAsString(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Invalid interview id" });
        const parseResult = interview_validation_1.updateInterviewSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json(formatValidationError(parseResult.error));
        }
        const interview = await interview_service_1.interviewService.updateDraft(id, employerId, parseResult.data);
        return res.json(interview);
    }
    catch (err) {
        console.error("updateInterview error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.updateInterview = updateInterview;
/**
 * POST /api/employer/interviews/generate-email
 * Generate and return an email preview (HTML body + subject).
 * Does NOT save or send — purely for preview display.
 */
const generateEmailPreview = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        const parseResult = interview_validation_1.generateEmailSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json(formatValidationError(parseResult.error));
        }
        const preview = await interview_service_1.interviewService.generateEmailPreview(employerId, parseResult.data);
        return res.json(preview);
    }
    catch (err) {
        console.error("generateEmailPreview error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.generateEmailPreview = generateEmailPreview;
/**
 * POST /api/employer/interviews/:id/schedule
 * Confirm the interview and send the invitation email.
 * Changes status DRAFT → SCHEDULED.
 */
const scheduleAndSend = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        const id = getParamAsString(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Invalid interview id" });
        const interview = await interview_service_1.interviewService.scheduleAndSend(id, employerId);
        return res.json(interview);
    }
    catch (err) {
        console.error("scheduleAndSend error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.scheduleAndSend = scheduleAndSend;
/**
 * PATCH /api/employer/interviews/:id/email-body
 * Save the employer's custom email body text.
 */
const saveEmailBody = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        const id = getParamAsString(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Invalid interview id" });
        const { emailBody } = req.body;
        if (typeof emailBody !== "string") {
            return res.status(400).json({ message: "emailBody must be a string" });
        }
        const interview = await interview_service_1.interviewService.saveEmailBody(id, employerId, emailBody);
        return res.json(interview);
    }
    catch (err) {
        console.error("saveEmailBody error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.saveEmailBody = saveEmailBody;
/**
 * DELETE /api/employer/interviews/:id
 * Cancel and delete an interview.
 * Also removes the associated Google Calendar event.
 */
const cancelInterview = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        const id = getParamAsString(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Invalid interview id" });
        await interview_service_1.interviewService.cancel(id, employerId);
        return res.status(204).send();
    }
    catch (err) {
        console.error("cancelInterview error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.cancelInterview = cancelInterview;
/**
 * POST /api/employer/interviews/:id/generate-cancel-email
 * Generate a cancellation email preview.
 * Returns EmailPreviewDTO { subject, body }.
 */
const generateCancelEmailPreview = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        const id = getParamAsString(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Invalid interview id" });
        const { reason } = req.body;
        if (typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ message: "reason is required" });
        }
        const preview = await interview_service_1.interviewService.generateCancelEmailPreview(id, employerId, reason);
        return res.json(preview);
    }
    catch (err) {
        console.error("generateCancelEmailPreview error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.generateCancelEmailPreview = generateCancelEmailPreview;
/**
 * POST /api/employer/interviews/:id/cancel-and-send
 * Cancel interview and send cancellation email to candidate.
 * Changes status SCHEDULED → CANCELLED.
 * Removes Google Calendar event.
 * Returns updated InterviewDTO.
 */
const cancelAndSendEmail = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        const id = getParamAsString(req.params.id);
        if (!id)
            return res.status(400).json({ message: "Invalid interview id" });
        const { reason, emailBody } = req.body;
        if (typeof reason !== "string" || !reason.trim()) {
            return res.status(400).json({ message: "reason is required" });
        }
        if (typeof emailBody !== "string") {
            return res.status(400).json({ message: "emailBody must be a string" });
        }
        const interview = await interview_service_1.interviewService.cancelAndSendEmail(id, employerId, reason, emailBody);
        return res.json(interview);
    }
    catch (err) {
        console.error("cancelAndSendEmail error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.cancelAndSendEmail = cancelAndSendEmail;
/**
 * GET /api/employer/interviews/candidates/:candidateProfileId
 * Fetch candidate profile details for schedule UI.
 */
const getCandidateProfile = async (req, res) => {
    try {
        const employerId = getEmployerId(req);
        if (!employerId)
            return res.status(401).json({ message: "Unauthorized" });
        const candidateProfileId = getParamAsString(req.params.candidateProfileId);
        if (!candidateProfileId) {
            return res.status(400).json({ message: "Invalid candidate profile id" });
        }
        if (!isUuid(candidateProfileId)) {
            return res.status(400).json({ message: "Candidate profile id must be a valid UUID" });
        }
        const candidate = await interview_service_1.interviewService.getCandidateProfile(employerId, candidateProfileId);
        return res.json(candidate);
    }
    catch (err) {
        console.error("getCandidateProfile error:", err);
        return res.status(resolveStatusCode(err)).json({ message: err.message });
    }
};
exports.getCandidateProfile = getCandidateProfile;
//# sourceMappingURL=interview.controller.js.map