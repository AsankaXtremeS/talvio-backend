import { prisma } from "../../../config/db";
import { JobType } from "@prisma/client";

export const jobsRepository = {

  // Get jobs created in the last 24 hours
  findNewJobsByType: async (type: JobType) => {
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);

    return prisma.jobPost.findMany({
      where: {
        status: "ACTIVE",
        type: type,
        createdAt: {
          gte: yesterday,
        },
      },
      include: {
        employer: {
          select: {
            companyName: true,
            companyLogoUrl: true,
            companyLocation: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
  
  // Get all ACTIVE job posts filtered by type (JOB or INTERNSHIP)
  findActiveJobsByType: async (type: JobType, page: number, limit: number) => {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.jobPost.findMany({
        where: {
          status: "ACTIVE",
          type: type,
        },
        include: {
          employer: {
            select: {
              companyName: true,
              companyLogoUrl: true,
              companyLocation: true,
              companyDescription: true,
              companyWebsite: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.jobPost.count({
        where: {
          status: "ACTIVE",
          type: type,
        },
      }),
    ]);

    return { jobs, total };
  },
};