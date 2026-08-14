"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobPostQuerySchema = exports.updateJobPostSchema = exports.createJobPostSchema = void 0;
const zod_1 = require("zod");
const normalizeStringList = (value) => {
    const parts = Array.isArray(value) ? value : value.split(/\r?\n|,/);
    return parts.map((item) => item.trim()).filter(Boolean);
};
const jobPostStatusEnum = zod_1.z.enum(["Draft", "Active", "Closed"]);
// Accept exactly the frontend's field names and types
exports.createJobPostSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(150).trim(),
    type: zod_1.z.enum(["Job", "Internship"]),
    closingDate: zod_1.z.string().max(30),
    location: zod_1.z.string().max(255),
    description: zod_1.z.string().min(20).max(700),
    responsibilities: zod_1.z.string().min(20).max(700).optional().or(zod_1.z.literal("")).default(""),
    requirements: zod_1.z.string().min(20).max(700),
    additionalInformation: zod_1.z.string().min(20).max(700).optional().or(zod_1.z.literal("")).default(""),
    skills: zod_1.z.string().max(1000),
    workMode: zod_1.z.enum(["On site", "Remote", "Hybrid"]),
    employmentType: zod_1.z.enum(["Full-time", "Part-time", "Contract"]),
    status: jobPostStatusEnum.optional().default("Active"),
});
exports.updateJobPostSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(150).trim().optional(),
    type: zod_1.z.enum(["Job", "Internship"]).optional(),
    closingDate: zod_1.z.string().max(30).optional(),
    location: zod_1.z.string().max(255).optional(),
    description: zod_1.z.string().min(20).max(700).optional(),
    responsibilities: zod_1.z.string().min(20).max(700).optional().or(zod_1.z.literal("")),
    requirements: zod_1.z.string().min(20).max(700).optional(),
    additionalInformation: zod_1.z.string().min(20).max(700).optional().or(zod_1.z.literal("")),
    skills: zod_1.z.string().max(1000).optional(),
    workMode: zod_1.z.enum(["On site", "Remote", "Hybrid"]).optional(),
    employmentType: zod_1.z.enum(["Full-time", "Part-time", "Contract"]).optional(),
    status: jobPostStatusEnum.optional(),
});
exports.jobPostQuerySchema = zod_1.z.object({
    status: zod_1.z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
    type: zod_1.z.enum(["JOB", "INTERNSHIP"]).optional(),
    search: zod_1.z.string().max(100).trim().optional(),
    page: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 20)),
});
//# sourceMappingURL=jobPosts.validation.js.map