import { z } from "zod";

const meetingTypeEnum = z.enum(["ONLINE", "ONSITE", "PHONE"], {
  message: "Meeting type must be ONLINE, ONSITE, or PHONE",
});

export const createInterviewSchema = z
  .object({
    jobPostId: z.string().uuid("Job post ID must be a valid UUID"),
    candidateProfileId: z.string().uuid("Candidate profile ID must be a valid UUID"),

    // scheduledAt must be a valid datetime string
    scheduledAt: z
      .string()
      .min(1, "Scheduled date/time is required")
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "scheduledAt must be a valid ISO 8601 date-time string",
      })
      .refine((val) => new Date(val) > new Date(), {
        message: "Interview must be scheduled in the future",
      }),

    meetingType: meetingTypeEnum,
    meetingLink: z.string().url("Invalid meeting link URL").max(1000).optional(),
    location: z.string().max(500).optional(),
    additionalInfo: z.string().max(2000).optional(),

    // Email body is optional — backend can generate a default template
    emailBody: z.string().max(10000).optional(),
    
    // Reschedule fields
    isReschedule: z.boolean().optional().default(false),
    rescheduledFromId: z.string().uuid().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Enforce location presence for ONSITE interviews
    if (data.meetingType === "ONSITE" && (!data.location || data.location.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Location is required for on-site interviews",
        path: ["location"],
      });
    }
  });

//  Update Interview 

export const updateInterviewSchema = z
  .object({
    scheduledAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "scheduledAt must be a valid ISO 8601 date-time string",
      })
      .optional(),

    meetingType: meetingTypeEnum.optional(),
    meetingLink: z.string().url("Invalid meeting link URL").max(1000).optional().nullable(),
    location: z.string().max(500).optional().nullable(),
    additionalInfo: z.string().max(2000).optional().nullable(),
    emailBody: z.string().max(10000).optional().nullable(),
    status: z.enum(["DRAFT", "SCHEDULED", "CANCELLED", "COMPLETED"]).optional(),
    isReschedule: z.boolean().optional(),
    rescheduledFromId: z.string().uuid().optional().nullable(),
    rescheduledToId: z.string().uuid().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // If changing to ONSITE and no location, reject
    if (data.meetingType === "ONSITE" && data.location !== undefined && !data.location?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Location is required for on-site interviews",
        path: ["location"],
      });
    }
  });

//  Generate Email Preview 

export const generateEmailSchema = z.object({
  jobPostId: z.string().uuid("Job post ID must be a valid UUID"),
  candidateProfileId: z.string().uuid("Candidate profile ID must be a valid UUID"),
  scheduledAt: z
    .string()
    .min(1, "Scheduled date/time is required")
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "scheduledAt must be a valid ISO 8601 date-time string",
    }),
  meetingType: meetingTypeEnum,
  location: z.string().max(500).optional(),
  meetingLink: z.string().url().optional(),    // Pre-existing link if already generated
  additionalInfo: z.string().max(2000).optional(),
  isReschedule: z.boolean().optional().default(false),  // Flag for reschedule email
});

// ─── Query Params for Interview List ─────────────────────────────────────────

export const interviewQuerySchema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "CANCELLED", "COMPLETED"]).optional(),
  date: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
    message: "date must be a valid date string (YYYY-MM-DD)",
  }),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => v > 0, { message: "page must be a positive integer" }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => v > 0 && v <= 100, { message: "limit must be between 1 and 100" }),
});

// ─── Exported Input Types 

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;
export type GenerateEmailInput = z.infer<typeof generateEmailSchema>;
export type InterviewQueryInput = z.infer<typeof interviewQuerySchema>;