"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidateRepository = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../../config/db");
exports.candidateRepository = {
    async findProfileByUserId(userId) {
        return db_1.prisma.candidateProfile.findUnique({
            where: { userId },
        });
    },
    async upsertProfile(userId, data) {
        return db_1.prisma.candidateProfile.upsert({
            where: { userId },
            create: {
                userId,
                ...data,
            },
            update: data,
        });
    },
    async clearResume(userId) {
        return db_1.prisma.candidateProfile.update({
            where: { userId },
            data: {
                cvUrl: null,
                cvFileName: null,
                extractedSkills: [],
                recommendationCache: client_1.Prisma.DbNull,
                lastRecommendedAt: null,
                jobAnalysisCache: {},
            },
        });
    },
};
//# sourceMappingURL=candidate.repository.js.map