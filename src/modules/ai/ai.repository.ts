import { prisma } from "../../config/db";

/**
 * Interfaces for cached AI data structures
 */
export interface CachedAnalysis {
  overallScore: number;
  suggestions: string[];
  coverLetter: string;
  cachedAt?: Date;
}

/**
 * Repository layer for AI-related database operations.
 * Handles persistence for recommendations and analysis results.
 */
export const aiRepository = {

  /**
   * Retrieves a candidate profile by their user ID.
   */
  async findCandidateProfileByUserId(userId: string) {
    return prisma.candidateProfile.findUnique({
      where: { userId },
    });
  },

  /**
   * Updates the recommendation cache for a specific candidate.
   */
  async updateRecommendationCache(userId: string, recommendations: any[]) {
    return prisma.candidateProfile.update({
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
  async updateAnalysisCache(userId: string, jobId: string, analysis: CachedAnalysis) {
    const profile = await this.findCandidateProfileByUserId(userId);
    const existingCache = (profile?.jobAnalysisCache as unknown as Record<string, CachedAnalysis>) || {};
    
    return prisma.candidateProfile.update({
      where: { userId },
      data: {
        jobAnalysisCache: {
          ...existingCache,
          [jobId]: {
            ...analysis,
            cachedAt: new Date(),
          },
        } as any,
      },
    });
  },

  /**
   * Retrieves a cached analysis result for a specific user and job.
   */
  async findAnalysisInCache(userId: string, jobId: string): Promise<CachedAnalysis | null> {
    const profile = await this.findCandidateProfileByUserId(userId);
    const cache = (profile?.jobAnalysisCache as unknown as Record<string, CachedAnalysis>) || {};
    return cache[jobId] || null;
  },

  /**
   * Persists the final AI analysis result to an application record.
   */
  async saveAnalysisResult(
    applicationId: string,
    result: {
      aiScore: number;
      aiSuggestions: string[];
      coverLetter: string;
    }
  ) {
    return prisma.application.update({
      where: { id: applicationId },
      data: result,
    });
  },

  /**
   * Retrieves active job posts filtered by type (JOB/INTERNSHIP).
   */
  async findActiveJobsByRole(jobType: "JOB" | "INTERNSHIP") {
    return prisma.jobPost.findMany({
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
  async findJobPostById(postId: string) {
    return prisma.jobPost.findUnique({
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

