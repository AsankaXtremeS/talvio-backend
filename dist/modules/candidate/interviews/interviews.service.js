"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateInterviewsService = void 0;
const db_1 = require("../../../config/db");
const interviews_repository_1 = require("./interviews.repository");
const buildError = (message, statusCode) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};
const toInterviewDTO = (raw) => ({
    id: raw.id,
    status: raw.status,
    scheduledAt: raw.scheduledAt.toISOString(),
    meetingType: raw.meetingType,
    location: raw.location ?? null,
    meetingLink: raw.meetingLink ?? null,
    googleCalendarLink: raw.googleCalendarLink ?? null,
    additionalInfo: raw.additionalInfo ?? null,
    cancelledAt: raw.cancelledAt ? raw.cancelledAt.toISOString() : null,
    cancellationReason: raw.cancellationReason ?? null,
    rescheduledFromId: raw.rescheduledFromId ?? null,
    rescheduledToId: raw.rescheduledToId ?? null,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
    company: {
        name: raw.employer?.companyName ?? "",
        location: raw.employer?.companyLocation ?? null,
        description: raw.employer?.companyDescription ?? null,
        website: raw.employer?.companyWebsite ?? null,
        logoUrl: raw.employer?.companyLogoUrl ?? null,
    },
    jobPost: {
        id: raw.jobPost?.id ?? "",
        title: raw.jobPost?.title ?? "",
        type: raw.jobPost?.type ?? null,
        workMode: raw.jobPost?.workMode ?? null,
        employmentType: raw.jobPost?.employmentType ?? null,
        stipendType: raw.jobPost?.stipendType ?? null,
        duration: raw.jobPost?.duration ?? null,
        location: raw.jobPost?.location ?? null,
        description: raw.jobPost?.description ?? null,
        responsibilities: raw.jobPost?.responsibilities ?? [],
    },
});
const getCandidateProfileId = async (userId) => {
    const profile = await db_1.prisma.candidateProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!profile) {
        return null;
    }
    return profile.id;
};
exports.candidateInterviewsService = {
    async listByCandidate(userId, options) {
        const candidateProfileId = await getCandidateProfileId(userId);
        if (!candidateProfileId) {
            return {
                data: [],
                pagination: {
                    total: 0,
                    page: options.page,
                    limit: options.limit,
                    totalPages: 0,
                },
            };
        }
        const { total, interviews } = await interviews_repository_1.candidateInterviewsRepository.findByCandidate(candidateProfileId, options);
        return {
            data: interviews.map(toInterviewDTO),
            pagination: {
                total,
                page: options.page,
                limit: options.limit,
                totalPages: Math.ceil(total / options.limit),
            },
        };
    },
    async getById(userId, interviewId) {
        const candidateProfileId = await getCandidateProfileId(userId);
        if (!candidateProfileId) {
            throw buildError("Interview not found", 404);
        }
        const interview = await interviews_repository_1.candidateInterviewsRepository.findOneByCandidate(candidateProfileId, interviewId);
        if (!interview) {
            throw buildError("Interview not found", 404);
        }
        return toInterviewDTO(interview);
    },
    async getScheduledDates(userId, year, month) {
        const candidateProfileId = await getCandidateProfileId(userId);
        if (!candidateProfileId) {
            return [];
        }
        return interviews_repository_1.candidateInterviewsRepository.getScheduledDates(candidateProfileId, year, month);
    },
};
//# sourceMappingURL=interviews.service.js.map