import { z } from "zod";

const safeUrl = z
  .string()
  .max(500)
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      try {
        const url = new URL(val);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid URL" }
  )
  .optional()
  .or(z.literal(""));

const currentYear = new Date().getFullYear();

export const updateProfileSchema = z.object({
  companyName:        z.string().min(1).max(200).trim().optional(),
  companyDescription: z.string().max(2000).trim().optional().or(z.literal("")),
  companyWebsite:     safeUrl,
  companyLocation:    z.string().max(255).trim().optional().or(z.literal("")),
  companyLogoUrl:     safeUrl,
  coverImageUrl:      safeUrl,
  industry:           z.string().max(100).trim().optional().or(z.literal("")),
  companyType:        z.string().max(100).trim().optional().or(z.literal("")),
  companySize:        z.string().max(50).trim().optional().or(z.literal("")),
  foundedYear:        z.number().int().min(1800).max(currentYear).optional().nullable(),
  specialties:        z.string().max(2000).trim().optional().or(z.literal("")),
  linkedInUrl:        safeUrl,
  facebookUrl:        safeUrl,
  twitterUrl:         safeUrl,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;