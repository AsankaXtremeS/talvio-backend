"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRepository = void 0;
const db_1 = require("../../config/db");
/**
 * Repository layer for AI-related database operations.
 * Handles persistence for recommendations and analysis results.
 */
exports.aiRepository = {
    /**
     * Retrieves a candidate profile by their user ID.
     */
    async findCandidateProfileByUserId(userId) {
        return db_1.prisma.candidateProfile.findUnique({
            where: { userId },
        });
    },
    /**
     * Updates the recommendation cache for a specific candidate.
     */
    async updateRecommendationCache(userId, recommendations) {
        return db_1.prisma.candidateProfile.update({
            where: { userId },
            data: {
                recommendationCache: recommendations,
                lastRecommendedAt: new Date(),
            },
        });
    },
    /**
     * Updates the job analysis cache with a new entry.
     * Merges with existing cache entries for other jobs.
     */
    async updateAnalysisCache(userId, jobId, analysis) {
        const profile = await this.findCandidateProfileByUserId(userId);
        const existingCache = profile?.jobAnalysisCache || {};
        return db_1.prisma.candidateProfile.update({
            where: { userId },
            data: {
                jobAnalysisCache: {
                    ...existingCache,
                    [jobId]: {
                        ...analysis,
                        cachedAt: new Date(),
                    },
                },
            },
        });
    },
    /**
     * Retrieves a cached analysis result for a specific user and job.
     */
    async findAnalysisInCache(userId, jobId) {
        const profile = await this.findCandidateProfileByUserId(userId);
        const cache = profile?.jobAnalysisCache || {};
        return cache[jobId] || null;
    },
    /**
     * Persists the final AI analysis result to an application record.
     */
    async saveAnalysisResult(applicationId, result) {
        return db_1.prisma.application.update({
            where: { id: applicationId },
            data: result,
        });
    },
    /**
     * Retrieves active job posts filtered by type (JOB/INTERNSHIP).
     */
    async findActiveJobsByRole(jobType) {
        return db_1.prisma.jobPost.findMany({
            where: {
                status: "ACTIVE",
                type: jobType,
            },
            include: {
                employer: {
                    select: {
                        companyName: true,
                        companyLogoUrl: true,
                    },
                },
            },
        });
    },
    /**
     * Fetches a detailed job post by its ID, including employer context.
     */
    async findJobPostById(postId) {
        return db_1.prisma.jobPost.findUnique({
            where: { id: postId },
            include: {
                employer: {
                    select: {
                        companyName: true,
                        companyLogoUrl: true,
                    },
                },
            },
        });
    },
};
//# sourceMappingURL=ai.repository.js.map