import { prisma } from "../../../config/db";
import { UpdateProfileInput } from "./profile.validation";

const EMPLOYER_PROFILE_SELECT = {
  id: true,
  companyName: true,
  companyDescription: true,
  companyWebsite: true,
  companyLocation: true,
  companyLogoUrl: true,
  coverImageUrl: true,
  industry: true,
  companyType: true,
  companySize: true,
  foundedYear: true,
  specialties: true,
  linkedInUrl: true,
  facebookUrl: true,
  twitterUrl: true,
  registrationFileUrl: true,
  registrationFileName: true,
  verificationStatus: true,
  rejectionReason: true,
  googleCalendarConnected: true,
  microsoftCalendarConnected: true,
  calendarProvider: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

export const profileRepository = {
  async findByUserId(userId: string) {
    return prisma.employerProfile.findUnique({
      where: { userId },
      select: EMPLOYER_PROFILE_SELECT,
    });
  },

  async updateCalendarTokensByUserId(userId: string, data: any) {
    return prisma.employerProfile.update({
      where: { userId },
      data,
      select: EMPLOYER_PROFILE_SELECT,
    });
  },

  async updateGoogleTokensByUserId(userId: string, data: any) {
    return this.updateCalendarTokensByUserId(userId, data);
  },

  async updateByUserId(userId: string, data: UpdateProfileInput) {
    const updateData: Record<string, unknown> = {};

    if (data.companyName        !== undefined) updateData.companyName        = data.companyName;
    if (data.companyDescription !== undefined) updateData.companyDescription = data.companyDescription || null;
    if (data.companyWebsite     !== undefined) updateData.companyWebsite     = data.companyWebsite     || null;
    if (data.companyLocation    !== undefined) updateData.companyLocation    = data.companyLocation    || null;
    if (data.companyLogoUrl     !== undefined) updateData.companyLogoUrl     = data.companyLogoUrl     || null;
    if (data.coverImageUrl      !== undefined) updateData.coverImageUrl      = data.coverImageUrl      || null;
    if (data.industry           !== undefined) updateData.industry           = data.industry           || null;
    if (data.companyType        !== undefined) updateData.companyType        = data.companyType        || null;
    if (data.companySize        !== undefined) updateData.companySize        = data.companySize        || null;
    if (data.foundedYear        !== undefined) updateData.foundedYear        = data.foundedYear        ?? null;
    if (data.specialties        !== undefined) updateData.specialties        = data.specialties        || null;
    if (data.linkedInUrl        !== undefined) updateData.linkedInUrl        = data.linkedInUrl        || null;
    if (data.facebookUrl        !== undefined) updateData.facebookUrl        = data.facebookUrl        || null;
    if (data.twitterUrl         !== undefined) updateData.twitterUrl         = data.twitterUrl         || null;

    return prisma.employerProfile.update({
      where: { userId },
      data: updateData,
      select: EMPLOYER_PROFILE_SELECT,
    });
  },
};