import { Prisma } from "@prisma/client";
import { prisma } from "../../config/db";

export const candidateRepository = {
  async findProfileByUserId(userId: string) {
    return prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  },

  async upsertProfile(
    userId: string,
    data: {
      cvUrl?: string | null;
      cvFileName?: string | null;
      extractedSkills?: string[];
      skills?: string[];
      bio?: string | null;
      headline?: string | null;
      location?: string | null;
      profilePictureUrl?: string | null;
      linkedinUrl?: string | null;
      githubUrl?: string | null;
      portfolioUrl?: string | null;
    }
  ) {
    return prisma.candidateProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...data,
      },
      update: data,
    });
  },

  async clearResume(userId: string) {
    return prisma.candidateProfile.update({
      where: { userId },
      data: {
        cvUrl: null,
        cvFileName: null,
        extractedSkills: [],
        recommendationCache: Prisma.DbNull,
        lastRecommendedAt: null,
        jobAnalysisCache: {},
      },
    });
  },
};
