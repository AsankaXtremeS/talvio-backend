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
export declare const aiRepository: {
    /**
     * Retrieves a candidate profile by their user ID.
     */
    findCandidateProfileByUserId(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        location: string | null;
        skills: string[];
        cvUrl: string | null;
        cvFileName: string | null;
        headline: string | null;
        bio: string | null;
        linkedinUrl: string | null;
        githubUrl: string | null;
        portfolioUrl: string | null;
        profilePictureUrl: string | null;
        extractedSkills: string[];
        recommendationCache: import("@prisma/client/runtime/library").JsonValue | null;
        lastRecommendedAt: Date | null;
        jobAnalysisCache: import("@prisma/client/runtime/library").JsonValue | null;
    } | null>;
    /**
     * Updates the recommendation cache for a specific candidate.
     */
    updateRecommendationCache(userId: string, recommendations: any[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        location: string | null;
        skills: string[];
        cvUrl: string | null;
        cvFileName: string | null;
        headline: string | null;
        bio: string | null;
        linkedinUrl: string | null;
        githubUrl: string | null;
        portfolioUrl: string | null;
        profilePictureUrl: string | null;
        extractedSkills: string[];
        recommendationCache: import("@prisma/client/runtime/library").JsonValue | null;
        lastRecommendedAt: Date | null;
        jobAnalysisCache: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    /**
     * Updates the job analysis cache with a new entry.
     * Merges with existing cache entries for other jobs.
     */
    updateAnalysisCache(userId: string, jobId: string, analysis: CachedAnalysis): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        location: string | null;
        skills: string[];
        cvUrl: string | null;
        cvFileName: string | null;
        headline: string | null;
        bio: string | null;
        linkedinUrl: string | null;
        githubUrl: string | null;
        portfolioUrl: string | null;
        profilePictureUrl: string | null;
        extractedSkills: string[];
        recommendationCache: import("@prisma/client/runtime/library").JsonValue | null;
        lastRecommendedAt: Date | null;
        jobAnalysisCache: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    /**
     * Retrieves a cached analysis result for a specific user and job.
     */
    findAnalysisInCache(userId: string, jobId: string): Promise<CachedAnalysis | null>;
    /**
     * Persists the final AI analysis result to an application record.
     */
    saveAnalysisResult(applicationId: string, result: {
        aiScore: number;
        aiSuggestions: string[];
        coverLetter: string;
    }): Promise<{
        id: string;
        updatedAt: Date;
        candidateProfileId: string;
        jobPostId: string;
        cvUrl: string;
        cvFileName: string | null;
        coverLetter: string | null;
        aiScore: number | null;
        aiSuggestions: string[];
        applicationStatus: import(".prisma/client").$Enums.ApplicationStatus;
        appliedAt: Date;
    }>;
    /**
     * Retrieves active job posts filtered by type (JOB/INTERNSHIP).
     */
    findActiveJobsByRole(jobType: "JOB" | "INTERNSHIP"): Promise<({
        employer: {
            companyName: string;
            companyLogoUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PostStatus;
        title: string;
        type: import(".prisma/client").$Enums.JobType;
        description: string | null;
        requirements: string[];
        responsibilities: string[];
        skillsRequired: string[];
        additionalInformation: string | null;
        workMode: import(".prisma/client").$Enums.WorkMode | null;
        employmentType: import(".prisma/client").$Enums.EmploymentType | null;
        stipendType: import(".prisma/client").$Enums.StipendType | null;
        location: string | null;
        duration: string | null;
        experienceLevel: import(".prisma/client").$Enums.ExperienceLevel | null;
        closingDate: Date | null;
        employerId: string;
    })[]>;
    /**
     * Fetches a detailed job post by its ID, including employer context.
     */
    findJobPostById(postId: string): Promise<({
        employer: {
            companyName: string;
            companyLogoUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PostStatus;
        title: string;
        type: import(".prisma/client").$Enums.JobType;
        description: string | null;
        requirements: string[];
        responsibilities: string[];
        skillsRequired: string[];
        additionalInformation: string | null;
        workMode: import(".prisma/client").$Enums.WorkMode | null;
        employmentType: import(".prisma/client").$Enums.EmploymentType | null;
        stipendType: import(".prisma/client").$Enums.StipendType | null;
        location: string | null;
        duration: string | null;
        experienceLevel: import(".prisma/client").$Enums.ExperienceLevel | null;
        closingDate: Date | null;
        employerId: string;
    }) | null>;
};
//# sourceMappingURL=ai.repository.d.ts.map