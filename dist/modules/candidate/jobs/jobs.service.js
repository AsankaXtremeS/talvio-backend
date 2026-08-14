"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsService = void 0;
const client_1 = require("@prisma/client");
const jobs_repository_1 = require("./jobs.repository");
exports.jobsService = {
    // Get new jobs posted in last 24 hours based on role
    getNewJobsByRole: async (role) => {
        const jobType = role === "PROFESSIONAL" ? client_1.JobType.JOB : client_1.JobType.INTERNSHIP;
        const jobs = await jobs_repository_1.jobsRepository.findNewJobsByType(jobType);
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
    getJobsByRole: async (role, page = 1, limit = 20) => {
        const jobType = role === "PROFESSIONAL" ? client_1.JobType.JOB : client_1.JobType.INTERNSHIP;
        const { jobs, total } = await jobs_repository_1.jobsRepository.findActiveJobsByType(jobType, page, limit);
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
//# sourceMappingURL=jobs.service.js.map