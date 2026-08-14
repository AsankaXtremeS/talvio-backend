"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationsService = exports.ApplicationsService = void 0;
const db_1 = require("../../../config/db");
const candidate_repository_1 = require("../candidate.repository");
const applications_repository_1 = require("./applications.repository");
const ai_service_1 = require("../../ai/ai.service");
const prismaAny = db_1.prisma;
class ApplicationsService {
    async getCandidateApplications(userId, page, limit) {
        const skip = (page - 1) * limit;
        // First find the candidate profile for this user
        const candidateProfile = await candidate_repository_1.candidateRepository.findProfileByUserId(userId);
        if (!candidateProfile) {
            return {
                applications: [],
                total: 0,
                page,
                limit,
                totalPages: 0,
            };
        }
        const [applications, total] = await Promise.all([
            applications_repository_1.applicationsRepository.findManyByCandidate(candidateProfile.id, skip, limit),
            applications_repository_1.applicationsRepository.countByCandidate(candidateProfile.id),
        ]);
        return {
            applications,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async applyToJob(userId, jobPostId, data) {
        // 1. Ensure candidate profile exists
        const candidateProfile = await db_1.prisma.candidateProfile.upsert({
            where: { userId },
            update: {},
            create: { userId },
        });
        // 2. Fetch Job Details for AI analysis
        const jobPost = await db_1.prisma.jobPost.findUnique({
            where: { id: jobPostId },
        });
        if (!jobPost)
            throw new Error("Job post not found");
        // 3. Handle CV Selection (Uploaded vs Default)
        let finalCvUrl = data.cvUrl;
        let finalCvFileName = data.cvFileName;
        if (data.useDefaultCv) {
            if (!candidateProfile.cvUrl)
                throw new Error("No default CV found in your profile. Please upload one first.");
            finalCvUrl = candidateProfile.cvUrl;
            finalCvFileName = candidateProfile.cvFileName || "Resume.pdf";
        }
        if (!finalCvUrl)
            throw new Error("Resume is required is apply for a job.");
        // 4. Check if already applied
        const existing = await db_1.prisma.application.findUnique({
            where: {
                candidateProfileId_jobPostId: {
                    candidateProfileId: candidateProfile.id,
                    jobPostId,
                },
            },
        });
        if (existing)
            throw new Error("Already applied to this job");
        // 5. Trigger AI Analysis (Score + Suggestions + Cover Letter if not provided)
        let aiScore = undefined;
        let aiSuggestions = [];
        let finalCoverLetter = data.coverLetter;
        try {
            const cvText = await ai_service_1.aiService.extractCvText(finalCvUrl);
            const fullJd = `${jobPost.title}\n${jobPost.description}\n${jobPost.requirements.join("\n")}`;
            const analysis = await ai_service_1.aiService.analyzeCv(cvText, fullJd);
            aiScore = analysis.overallScore;
            aiSuggestions = analysis.suggestions;
            // If user didn't provide a cover letter, we can use the AI generated one
            if (!finalCoverLetter) {
                finalCoverLetter = analysis.coverLetter;
            }
        }
        catch (error) {
            console.error("AI Analysis failed during application:", error);
            // We still allow application to proceed even if AI fails (robustness)
        }
        // 6. Create Application Record
        const application = await db_1.prisma.application.create({
            data: {
                candidateProfileId: candidateProfile.id,
                jobPostId,
                cvUrl: finalCvUrl,
                cvFileName: finalCvFileName,
                coverLetter: finalCoverLetter,
                aiScore,
                aiSuggestions,
            },
        });
        // 7. Invalidate Recommendation Cache by updating candidateProfile.updatedAt
        await db_1.prisma.candidateProfile.update({
            where: { id: candidateProfile.id },
            data: { updatedAt: new Date() }
        });
        return application;
    }
    async withdrawApplication(userId, applicationId) {
        const candidateProfile = await candidate_repository_1.candidateRepository.findProfileByUserId(userId);
        if (!candidateProfile)
            throw new Error("Candidate profile not found");
        const app = await applications_repository_1.applicationsRepository.findById(applicationId);
        if (!app || app.candidateProfileId !== candidateProfile.id)
            throw new Error("Application not found or unauthorized");
        const interview = await prismaAny.interview.findFirst({
            where: {
                candidateProfileId: candidateProfile.id,
                jobPostId: app.jobPostId,
                status: { in: ["SCHEDULED", "COMPLETED", "DRAFT"] }
            }
        });
        if (interview) {
            throw new Error("Cannot withdraw application after an interview has been scheduled.");
        }
        return applications_repository_1.applicationsRepository.delete(applicationId);
    }
    async getCandidateApplicationWithHistory(userId, applicationId) {
        const candidateProfile = await db_1.prisma.candidateProfile.findUnique({
            where: { userId },
        });
        if (!candidateProfile)
            throw new Error("Candidate profile not found");
        const application = await db_1.prisma.application.findFirst({
            where: {
                id: applicationId,
                candidateProfileId: candidateProfile.id,
            },
            include: {
                jobPost: {
                    include: {
                        employer: true,
                    },
                },
                statusHistory: {
                    orderBy: { changedAt: "asc" },
                },
            },
        });
        if (!application)
            throw new Error("Application not found or unauthorized");
        return application;
    }
    async getCandidateStats(userId) {
        // 1. Get User Role (needed for totalAvailable count)
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });
        const jobType = user?.role === "PROFESSIONAL" ? "JOB" : "INTERNSHIP";
        // 2. Fetch total available jobs/internships first (always available)
        const totalAvailable = await db_1.prisma.jobPost.count({
            where: {
                type: jobType,
                status: "ACTIVE",
            },
        });
        // 3. Find candidate profile for personal stats
        const candidateProfile = await candidate_repository_1.candidateRepository.findProfileByUserId(userId);
        // Note: for stats we need applications relation
        // Let's adjust candidateRepository to support includes or just use prisma for stats for now to avoid complexity,
        // but the task is to decouple.
        // I'll update candidateRepository.findProfileByUserId to optionally include things if needed,
        // or just fetch applications separately.
        const appliedJobIds = candidateProfile ?
            (await applications_repository_1.applicationsRepository.findManyByCandidate(candidateProfile.id, 0, 1000)).map(a => a.jobPostId) : [];
        if (!candidateProfile) {
            return {
                applicationsSent: 0,
                interviewsScheduled: 0,
                pendingMatches: 0,
                totalAvailable,
                profileViews: 0,
            };
        }
        // 4. Fetch personal stats in parallel
        const [applicationsSent, interviewsScheduled] = await Promise.all([
            candidateProfile ? applications_repository_1.applicationsRepository.countByCandidate(candidateProfile.id) : Promise.resolve(0),
            candidateProfile ? prismaAny.interview.count({
                where: {
                    candidateProfileId: candidateProfile.id,
                    status: "SCHEDULED",
                },
            }) : Promise.resolve(0),
        ]);
        // Calculate pending matches from recommendation cache
        let pendingMatches = 0;
        if (candidateProfile) {
            const recommendations = candidateProfile.recommendationCache || [];
            if (recommendations.length > 0) {
                const appliedIds = new Set(appliedJobIds);
                pendingMatches = recommendations.filter(rec => !appliedIds.has(rec.id)).length;
            }
        }
        return {
            applicationsSent,
            interviewsScheduled,
            pendingMatches,
            totalAvailable,
            profileViews: 0,
        };
    }
    async getApplicationById(applicationId) {
        return applications_repository_1.applicationsRepository.findById(applicationId);
    }
}
exports.ApplicationsService = ApplicationsService;
exports.applicationsService = new ApplicationsService();
//# sourceMappingURL=applications.service.js.map