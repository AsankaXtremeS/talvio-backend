"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobpostService = void 0;
const jobpost_repository_1 = require("./jobpost.repository");
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;
const buildHttpError = (message, statusCode) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};
const logoPalette = [
    "#1D4ED8",
    "#0EA5E9",
    "#0891B2",
    "#0F766E",
    "#059669",
    "#7C3AED",
    "#9333EA",
    "#C026D3",
    "#EA580C",
    "#DC2626",
];
const toInitials = (name) => {
    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (parts.length === 0)
        return "CO";
    if (parts.length === 1)
        return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};
const colorFromText = (text) => {
    if (!text)
        return logoPalette[0];
    const hash = text
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return logoPalette[hash % logoPalette.length];
};
const toCategory = (post) => {
    if (post.employmentType === "FULL_TIME")
        return "Full-time";
    if (post.employmentType === "PART_TIME")
        return "Part-time";
    if (post.employmentType === "CONTRACT")
        return "Contract";
    return post.type === "INTERNSHIP" ? "Internship" : "Job";
};
const toDTO = (post) => {
    const companyName = post.employer.companyName || "Unknown Company";
    return {
        id: post.id,
        companyName,
        companyEmail: post.employer.user.email,
        companyLogoColor: colorFromText(companyName),
        companyLogoText: toInitials(companyName),
        category: toCategory(post),
        jobTitle: post.title,
        type: post.type === "INTERNSHIP" ? "Internship" : "Job",
        closedDate: post.closingDate ? post.closingDate.toISOString() : undefined,
        isClosed: post.status === "CLOSED",
        closedApplications: post._count.applications,
        description: post.description || undefined,
    };
};
exports.jobpostService = {
    async getStats() {
        return jobpost_repository_1.jobpostRepository.getStats();
    },
    async getJobPosts(options) {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, options.limit ?? DEFAULT_PAGE_LIMIT));
        const search = options.search?.trim() || undefined;
        const { posts, total } = await jobpost_repository_1.jobpostRepository.findAll({
            search,
            page,
            limit,
        });
        return {
            data: posts.map(toDTO),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async getJobPostById(postId) {
        const post = await jobpost_repository_1.jobpostRepository.findById(postId);
        if (!post) {
            throw buildHttpError("Job post not found", 404);
        }
        return toDTO(post);
    },
    async deleteJobPost(postId) {
        const exists = await jobpost_repository_1.jobpostRepository.existsById(postId);
        if (!exists) {
            throw buildHttpError("Job post not found", 404);
        }
        await jobpost_repository_1.jobpostRepository.deleteById(postId);
    },
};
//# sourceMappingURL=jobpost.service.js.map