import { prisma } from "../../../config/db";
import { ApplicationStatus } from "@prisma/client";

export const applicationsRepository = {
  async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      include: {
        jobPost: {
          include: {
            employer: {
              select: {
                companyName: true,
                companyLogoUrl: true,
              },
            },
          },
        },
      },
    });
  },

  async findByCandidateAndJob(candidateProfileId: string, jobPostId: string) {
    return prisma.application.findUnique({
      where: {
        candidateProfileId_jobPostId: {
          candidateProfileId,
          jobPostId,
        },
      },
    });
  },

  async findManyByCandidate(candidateProfileId: string, skip: number, take: number) {
    return prisma.application.findMany({
      where: { candidateProfileId },
      include: {
        jobPost: {
          include: {
            employer: {
              select: {
                companyName: true,
                companyLogoUrl: true,
              },
            },
            interviews: {
              where: {
                candidateProfileId: candidateProfileId,
                status: {
                  in: ["DRAFT", "SCHEDULED", "COMPLETED"]
                }
              },
              orderBy: {
                scheduledAt: "desc"
              },
              take: 1
            }
          },
        },
      },
      orderBy: {
        appliedAt: "desc",
      },
      skip,
      take,
    });
  },

  async countByCandidate(candidateProfileId: string) {
    return prisma.application.count({
      where: { candidateProfileId },
    });
  },

  async create(data: {
    candidateProfileId: string;
    jobPostId: string;
    cvUrl: string;
    cvFileName?: string;
    coverLetter?: string;
  }) {
    return prisma.application.create({
      data,
    });
  },

  async delete(id: string) {
    return prisma.application.delete({
      where: { id },
    });
  },

  async updateStatus(id: string, status: ApplicationStatus) {
    return prisma.application.update({
      where: { id },
      data: { applicationStatus: status },
    });
  },
};
