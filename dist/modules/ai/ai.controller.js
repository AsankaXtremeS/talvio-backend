"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCoverLetter = exports.getRecommendations = void 0;
const client_1 = require("@prisma/client");
const ai_repository_1 = require("./ai.repository");
const ai_service_1 = require("./ai.service");
const candidate_repository_1 = require("../candidate/candidate.repository");
/**
 * Controller Constants
 */
const RECOMMENDATION_CACHE_HOURS = 12;
const CACHE_DURATION_MS = RECOMMENDATION_CACHE_HOURS * 60 * 60 * 1000;
const TOP_JOBS_FOR_AI_RANKING = 20;
const MINIMUM_MATCH_THRESHOLD = 70;
const CANDIDATE_BIO_LIMIT = 500;
const CV_TEXT_PREVIEW_LIMIT = 2000;
/**
 * Safely extracts a single parameter from the request.
 * Handles both string and string array cases.
 */
const extractRequiredParam = (value, paramName) => {
    const normalizedValue = Array.isArray(value) ? value[0] : value;
    if (!normalizedValue) {
        throw new Error(`Missing required parameter: ${paramName}`);
    }
    return normalizedValue;
};
/**
 * GET /api/ai/recommendations
 * Generates personalized job recommendations for the authenticated candidate.
 */
const getRecommendations = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "User session not found" });
        }
        // 1. Retrieve Candidate Profile
        const candidate = await candidate_repository_1.candidateRepository.findProfileByUserId(userId);
        if (!candidate) {
            return res.status(200).json({ recommendations: [] });
        }
        // 2. Check for Valid Cache
        const now = new Date();
        const hasValidCache = candidate.recommendationCache &&
            candidate.lastRecommendedAt &&
            (now.getTime() - candidate.lastRecommendedAt.getTime()) < CACHE_DURATION_MS &&
            candidate.lastRecommendedAt >= candidate.updatedAt;
        if (hasValidCache) {
            return res.status(200).json({
                recommendations: candidate.recommendationCache,
                fromCache: true
            });
        }
        // 3. Prepare Recommendation Data
        const jobType = req.user?.role === client_1.Role.PROFESSIONAL ? "JOB" : "INTERNSHIP";
        const availableJobs = await ai_repository_1.aiRepository.findActiveJobsByRole(jobType);
        const mergedSkills = [
            ...new Set([
                ...(candidate.skills || []),
                ...(candidate.extractedSkills || [])
            ])
        ];
        if (mergedSkills.length === 0) {
            return res.status(200).json({ recommendations: [] });
        }
        // 4. Initial Ranking by Keyword Similarity
        const preRankedJobs = await Promise.all(availableJobs.map(async (job) => {
            const keywords = job.skillsRequired?.length
                ? job.skillsRequired
                : await ai_service_1.aiService.extractJdKeywords(job.description || job.title);
            const initialScore = ai_service_1.aiService.calculateSimilarity(mergedSkills, keywords);
            return { ...job, initialScore };
        }));
        // Filter to top candidates for expensive AI ranking
        const topCandidates = preRankedJobs
            .sort((a, b) => b.initialScore - a.initialScore)
            .slice(0, TOP_JOBS_FOR_AI_RANKING);
        // 5. High-Precision AI Ranking
        let cvContent = "";
        if (candidate.cvUrl) {
            try {
                cvContent = await ai_service_1.aiService.extractCvText(candidate.cvUrl);
            }
            catch (err) {
                console.error("Non-critical CV extraction failure during ranking:", err);
            }
        }
        const candidateSummary = {
            headline: candidate.headline,
            skills: mergedSkills,
            bio: candidate.bio?.slice(0, CANDIDATE_BIO_LIMIT),
            cvContent: cvContent?.slice(0, CV_TEXT_PREVIEW_LIMIT)
        };
        const detailedRankings = await ai_service_1.aiService.rankJobsWithAI(candidateSummary, topCandidates);
        // 6. Consolidate and Format Final Recommendations
        const finalResults = topCandidates
            .map(job => {
            const aiRank = detailedRankings.find(r => r.id === job.id);
            const matchPercent = aiRank ? aiRank.matchPercent : job.initialScore;
            return {
                id: job.id,
                title: job.title,
                company: job.employer.companyName,
                companyLogoUrl: job.employer.companyLogoUrl,
                location: job.location,
                type: job.type,
                matchPercent,
                createdAt: job.createdAt,
                tags: [job.workMode, job.employmentType].filter(Boolean)
            };
        })
            .filter(job => job.matchPercent >= MINIMUM_MATCH_THRESHOLD)
            .sort((a, b) => b.matchPercent - a.matchPercent);
        // 7. Update Cache and Respond
        await ai_repository_1.aiRepository.updateRecommendationCache(userId, finalResults);
        return res.status(200).json({ recommendations: finalResults });
    }
    catch (err) {
        console.error("Recommendation Generation Error:", err);
        return res.status(500).json({ message: "Internal server error during recommendation processing" });
    }
};
exports.getRecommendations = getRecommendations;
/**
 * POST /api/ai/generate-cover-letter/:jobPostId
 * Generates a tailored cover letter for a specific job post.
 */
const generateCoverLetter = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized access" });
        }
        const jobPostId = extractRequiredParam(req.params.jobPostId, "jobPostId");
        // 1. Fetch Contextual Data
        const [jobPost, candidate] = await Promise.all([
            ai_repository_1.aiRepository.findJobPostById(jobPostId),
            candidate_repository_1.candidateRepository.findProfileByUserId(userId)
        ]);
        if (!jobPost) {
            return res.status(404).json({ message: "Target job post not found" });
        }
        const customCvUrl = req.body.customCvUrl;
        const activeCvUrl = customCvUrl || candidate?.cvUrl;
        if (!activeCvUrl) {
            return res.status(400).json({ message: "No CV provided for analysis" });
        }
        // 2. Check Analysis Cache (Only bypass for custom CVs)
        const cachedResult = !customCvUrl
            ? await ai_repository_1.aiRepository.findAnalysisInCache(userId, jobPostId)
            : null;
        if (cachedResult) {
            return res.status(200).json({
                ...cachedResult,
                fromCache: true
            });
        }
        // 3. Generate New Analysis and Cover Letter
        const cvContent = await ai_service_1.aiService.extractCvText(activeCvUrl);
        const jobDescription = [
            jobPost.title,
            jobPost.description,
            `Skills: ${jobPost.skillsRequired.join(", ")}`
        ].join("\n");
        const analysis = await ai_service_1.aiService.analyzeCv(cvContent, jobDescription);
        // 4. Persistence and Response
        await ai_repository_1.aiRepository.updateAnalysisCache(userId, jobPostId, analysis);
        return res.status(200).json({
            coverLetter: analysis.coverLetter,
            overallScore: analysis.overallScore,
            suggestions: analysis.suggestions
        });
    }
    catch (err) {
        console.error("Cover Letter Generation Error:", err);
        return res.status(500).json({ message: "Failed to generate tailored cover letter" });
    }
};
exports.generateCoverLetter = generateCoverLetter;
// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYER: APPLICANTS
// ─────────────────────────────────────────────────────────────────────────────
//# sourceMappingURL=ai.controller.js.map