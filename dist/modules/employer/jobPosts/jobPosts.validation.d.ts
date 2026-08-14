export type CreateJobPostInput = z.infer<typeof createJobPostSchema>;
export type UpdateJobPostInput = z.infer<typeof updateJobPostSchema>;
export type JobPostQueryInput = z.infer<typeof jobPostQuerySchema>;
import { z } from "zod";
export declare const createJobPostSchema: z.ZodObject<{
    title: z.ZodString;
    type: z.ZodEnum<{
        Job: "Job";
        Internship: "Internship";
    }>;
    closingDate: z.ZodString;
    location: z.ZodString;
    description: z.ZodString;
    responsibilities: z.ZodDefault<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    requirements: z.ZodString;
    additionalInformation: z.ZodDefault<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>>;
    skills: z.ZodString;
    workMode: z.ZodEnum<{
        "On site": "On site";
        Remote: "Remote";
        Hybrid: "Hybrid";
    }>;
    employmentType: z.ZodEnum<{
        "Full-time": "Full-time";
        "Part-time": "Part-time";
        Contract: "Contract";
    }>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        Draft: "Draft";
        Active: "Active";
        Closed: "Closed";
    }>>>;
}, z.core.$strip>;
export declare const updateJobPostSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<{
        Job: "Job";
        Internship: "Internship";
    }>>;
    closingDate: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    responsibilities: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    requirements: z.ZodOptional<z.ZodString>;
    additionalInformation: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
    skills: z.ZodOptional<z.ZodString>;
    workMode: z.ZodOptional<z.ZodEnum<{
        "On site": "On site";
        Remote: "Remote";
        Hybrid: "Hybrid";
    }>>;
    employmentType: z.ZodOptional<z.ZodEnum<{
        "Full-time": "Full-time";
        "Part-time": "Part-time";
        Contract: "Contract";
    }>>;
    status: z.ZodOptional<z.ZodEnum<{
        Draft: "Draft";
        Active: "Active";
        Closed: "Closed";
    }>>;
}, z.core.$strip>;
export declare const jobPostQuerySchema: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<{
        DRAFT: "DRAFT";
        ACTIVE: "ACTIVE";
        CLOSED: "CLOSED";
    }>>;
    type: z.ZodOptional<z.ZodEnum<{
        JOB: "JOB";
        INTERNSHIP: "INTERNSHIP";
    }>>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
    limit: z.ZodPipe<z.ZodOptional<z.ZodString>, z.ZodTransform<number, string | undefined>>;
}, z.core.$strip>;
//# sourceMappingURL=jobPosts.validation.d.ts.map