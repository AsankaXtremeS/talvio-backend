import { z } from "zod";
export declare const createInterviewSchema: z.ZodObject<{
    jobPostId: z.ZodString;
    candidateProfileId: z.ZodString;
    scheduledAt: z.ZodString;
    meetingType: z.ZodEnum<{
        ONLINE: "ONLINE";
        ONSITE: "ONSITE";
        PHONE: "PHONE";
    }>;
    meetingLink: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    additionalInfo: z.ZodOptional<z.ZodString>;
    emailBody: z.ZodOptional<z.ZodString>;
    isReschedule: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    rescheduledFromId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const updateInterviewSchema: z.ZodObject<{
    scheduledAt: z.ZodOptional<z.ZodString>;
    meetingType: z.ZodOptional<z.ZodEnum<{
        ONLINE: "ONLINE";
        ONSITE: "ONSITE";
        PHONE: "PHONE";
    }>>;
    meetingLink: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    location: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    additionalInfo: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    emailBody: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    status: z.ZodOptional<z.ZodEnum<{
        DRAFT: "DRAFT";
        SCHEDULED: "SCHEDULED";
        CANCELLED: "CANCELLED";
        COMPLETED: "COMPLETED";
    }>>;
    isReschedule: z.ZodOptional<z.ZodBoolean>;
    rescheduledFromId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    rescheduledToId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, z.core.$strip>;
export declare const generateEmailSchema: z.ZodObject<{
    jobPostId: z.ZodString;
    candidateProfileId: z.ZodString;
    scheduledAt: z.ZodString;
    meetingType: z.ZodEnum<{
        ONLINE: "ONLINE";
        ONSITE: "ONSITE";
        PHONE: "PHONE";
    }>;
    location: z.ZodOptional<z.ZodString>;
    meetingLink: z.ZodOptional<z.ZodString>;
    additionalInfo: z.ZodOptional<z.ZodString>;
    isReschedule: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export declare const interviewQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        DRAFT: "DRAFT";
        SCHEDULED: "SCHEDULED";
        CANCELLED: "CANCELLED";
        COMPLETED: "COMPLETED";
    }>>;
    date: z.ZodOptional<z.ZodString>;
    page: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
    limit: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
}, z.core.$strip>;
export type CreateInterviewInput = z.infer<typeof createInterviewSchema>;
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>;
export type GenerateEmailInput = z.infer<typeof generateEmailSchema>;
export type InterviewQueryInput = z.infer<typeof interviewQuerySchema>;
//# sourceMappingURL=interview.validation.d.ts.map