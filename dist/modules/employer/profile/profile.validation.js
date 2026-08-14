"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = void 0;
const zod_1 = require("zod");
const safeUrl = zod_1.z
    .string()
    .max(500)
    .trim()
    .refine((val) => {
    if (!val)
        return true;
    try {
        const url = new URL(val);
        return url.protocol === "https:" || url.protocol === "http:";
    }
    catch {
        return false;
    }
}, { message: "Must be a valid URL" })
    .optional()
    .or(zod_1.z.literal(""));
const currentYear = new Date().getFullYear();
exports.updateProfileSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(1).max(200).trim().optional(),
    companyDescription: zod_1.z.string().max(2000).trim().optional().or(zod_1.z.literal("")),
    companyWebsite: safeUrl,
    companyLocation: zod_1.z.string().max(255).trim().optional().or(zod_1.z.literal("")),
    companyLogoUrl: safeUrl,
    coverImageUrl: safeUrl,
    industry: zod_1.z.string().max(100).trim().optional().or(zod_1.z.literal("")),
    companyType: zod_1.z.string().max(100).trim().optional().or(zod_1.z.literal("")),
    companySize: zod_1.z.string().max(50).trim().optional().or(zod_1.z.literal("")),
    foundedYear: zod_1.z.number().int().min(1800).max(currentYear).optional().nullable(),
    specialties: zod_1.z.string().max(2000).trim().optional().or(zod_1.z.literal("")),
    linkedInUrl: safeUrl,
    facebookUrl: safeUrl,
    twitterUrl: safeUrl,
});
//# sourceMappingURL=profile.validation.js.map