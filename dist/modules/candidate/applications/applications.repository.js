"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationsRepository = void 0;
const db_1 = require("../../../config/db");
exports.applicationsRepository = {
    async findById(id) {
        return db_1.prisma.application.findUnique({
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
    async findByCandidateAndJob(candidateProfileId, jobPostId) {
        return db_1.prisma.application.findUnique({
            where: {
                candidateProfileId_jobPostId: {
                    candidateProfileId,
                    jobPostId,
                },
            },
        });
    },
    async findManyByCandidate(candidateProfileId, skip, take) {
        return db_1.prisma.application.findMany({
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
    async countByCandidate(candidateProfileId) {
        return db_1.prisma.application.count({
            where: { candidateProfileId },
        });
    },
    async create(data) {
        return db_1.prisma.application.create({
            data,
        });
    },
    async delete(id) {
        return db_1.prisma.application.delete({
            where: { id },
        });
    },
    async updateStatus(id, status) {
        return db_1.prisma.application.update({
            where: { id },
            data: { applicationStatus: status },
        });
    },
};
//# sourceMappingURL=applications.repository.js.map