"use strict";
// Zod validation schemas for interview scheduling endpoints.
// Each schema validates exactly what each endpoint accepts — nothing more.
// This prevents unexpected fields from reaching the service/database.
Object.defineProperty(exports, "__esModule", { value: true });
exports.interviewQuerySchema = exports.generateEmailSchema = exports.updateInterviewSchema = exports.createInterviewSchema = void 0;
const zod_1 = require("zod");
// ─── Shared Base ──────────────────────────────────────────────────────────────
const meetingTypeEnum = zod_1.z.enum(["ONLINE", "ONSITE", "PHONE"], {
    message: "Meeting type must be ONLINE, ONSITE, or PHONE",
});
// ─── Create Interview ─────────────────────────────────────────────────────────
exports.createInterviewSchema = zod_1.z
    .object({
    jobPostId: zod_1.z.string().uuid("Job post ID must be a valid UUID"),
    candidateProfileId: zod_1.z.string().uuid("Candidate profile ID must be a valid UUID"),
    // scheduledAt must be a valid ISO 8601 datetime string
    scheduledAt: zod_1.z
        .string()
        .min(1, "Scheduled date/time is required")
        .refine((val) => !isNaN(Date.parse(val)), {
        message: "scheduledAt must be a valid ISO 8601 date-time string",
    })
        .refine((val) => new Date(val) > new Date(), {
        message: "Interview must be scheduled in the future",
    }),
    meetingType: meetingTypeEnum,
    meetingLink: zod_1.z.string().url("Invalid meeting link URL").max(1000).optional(),
    location: zod_1.z.string().max(500).optional(),
    additionalInfo: zod_1.z.string().max(2000).optional(),
    // Email body is optional — backend can generate a default template
    emailBody: zod_1.z.string().max(10000).optional(),
    // Reschedule fields
    isReschedule: zod_1.z.boolean().optional().default(false),
    rescheduledFromId: zod_1.z.string().uuid().optional().nullable(),
})
    .superRefine((data, ctx) => {
    // Enforce location presence for ONSITE interviews
    if (data.meetingType === "ONSITE" && (!data.location || data.location.trim() === "")) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Location is required for on-site interviews",
            path: ["location"],
        });
    }
});
// ─── Update Interview ─────────────────────────────────────────────────────────
exports.updateInterviewSchema = zod_1.z
    .object({
    scheduledAt: zod_1.z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
        message: "scheduledAt must be a valid ISO 8601 date-time string",
    })
        .optional(),
    meetingType: meetingTypeEnum.optional(),
    meetingLink: zod_1.z.string().url("Invalid meeting link URL").max(1000).optional().nullable(),
    location: zod_1.z.string().max(500).optional().nullable(),
    additionalInfo: zod_1.z.string().max(2000).optional().nullable(),
    emailBody: zod_1.z.string().max(10000).optional().nullable(),
    status: zod_1.z.enum(["DRAFT", "SCHEDULED", "CANCELLED", "COMPLETED"]).optional(),
    isReschedule: zod_1.z.boolean().optional(),
    rescheduledFromId: zod_1.z.string().uuid().optional().nullable(),
    rescheduledToId: zod_1.z.string().uuid().optional().nullable(),
})
    .superRefine((data, ctx) => {
    // If changing to ONSITE and no location, reject
    if (data.meetingType === "ONSITE" && data.location !== undefined && !data.location?.trim()) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Location is required for on-site interviews",
            path: ["location"],
        });
    }
});
// ─── Generate Email Preview ───────────────────────────────────────────────────
exports.generateEmailSchema = zod_1.z.object({
    jobPostId: zod_1.z.string().uuid("Job post ID must be a valid UUID"),
    candidateProfileId: zod_1.z.string().uuid("Candidate profile ID must be a valid UUID"),
    scheduledAt: zod_1.z
        .string()
        .min(1, "Scheduled date/time is required")
        .refine((val) => !isNaN(Date.parse(val)), {
        message: "scheduledAt must be a valid ISO 8601 date-time string",
    }),
    meetingType: meetingTypeEnum,
    location: zod_1.z.string().max(500).optional(),
    meetingLink: zod_1.z.string().url().optional(), // Pre-existing link if already generated
    additionalInfo: zod_1.z.string().max(2000).optional(),
    isReschedule: zod_1.z.boolean().optional().default(false), // Flag for reschedule email
});
// ─── Query Params for Interview List ─────────────────────────────────────────
exports.interviewQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(["DRAFT", "SCHEDULED", "CANCELLED", "COMPLETED"]).optional(),
    date: zod_1.z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
        message: "date must be a valid date string (YYYY-MM-DD)",
    }),
    page: zod_1.z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : 1))
        .refine((v) => v > 0, { message: "page must be a positive integer" }),
    limit: zod_1.z
        .string()
        .optional()
        .transform((v) => (v ? parseInt(v, 10) : 20))
        .refine((v) => v > 0 && v <= 100, { message: "limit must be between 1 and 100" }),
});
//# sourceMappingURL=interview.validation.js.map