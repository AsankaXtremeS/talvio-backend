import { JobType } from "@prisma/client";
import { jobsRepository } from "./jobs.repository";

export const jobsService = {

  // Get new jobs posted in last 24 hours based on role
  getNewJobsByRole: async (role: string) => {
    const jobType: JobType = role === "PROFESSIONAL" ? JobType.JOB : JobType.INTERNSHIP;

    const jobs = await jobsRepository.findNewJobsByType(jobType);

    return {
      count: jobs.length,
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        company: job.employer.companyName,
        companyLogoUrl: job.employer.companyLogoUrl,
        location: job.location || job.employer.companyLocation || "Location not specified",
        createdAt: job.createdAt,
        type: job.type,
        workMode: job.workMode,
      })),
    };
  },


  // Get jobs based on candidate role
  // STUDENT → gets INTERNSHIP posts
  // PROFESSIONAL → gets JOB posts
  getJobsByRole: async (role: string, page: number = 1, limit: number = 20) => {
    const jobType: JobType = role === "PROFESSIONAL" ? JobType.JOB : JobType.INTERNSHIP;

    const { jobs, total } = await jobsRepository.findActiveJobsByType(jobType, page, limit);

    return {
      jobs: jobs.map((job) => ({
        id: job.id,
        title: job.title,
        type: job.type,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        skillsRequired: job.skillsRequired,
        workMode: job.workMode,
        employmentType: job.employmentType,
        stipendType: job.stipendType,
        location: job.location,
        duration: job.duration,
        experienceLevel: job.experienceLevel,
        closingDate: job.closingDate,
        createdAt: job.createdAt,
        company: job.employer.companyName,
        companyLogoUrl: job.employer.companyLogoUrl,
        companyLocation: job.employer.companyLocation,
        companyDescription: job.employer.companyDescription,
        companyWebsite: job.employer.companyWebsite,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

};