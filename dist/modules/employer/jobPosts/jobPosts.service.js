"use strict";
// Service layer for employer job post management.
// Owns business rules: employer verification, ownership checks, pagination,
// and response shaping for controllers.
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsService = void 0;
const client_1 = require("@prisma/client");
const jobPosts_repository_1 = require("./jobPosts.repository");
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;
const buildHttpError = (message, statusCode) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};
const mapToDTO = (post) => ({
    id: post.id,
    title: post.title,
    type: post.type === "JOB" ? "Job" : "Internship",
    status: post.status === "ACTIVE"
        ? "Active"
        : post.status === "CLOSED"
            ? "Closed"
            : "Draft",
    applicantsCount: typeof post?._count?.applications === "number"
        ? post._count.applications
        : Array.isArray(post?.applications)
            ? post.applications.length
            : 0,
    description: post.description ?? "",
    responsibilities: typeof post.responsibilities === "string"
        ? post.responsibilities
        : "",
    requirements: typeof post.requirements === "string"
        ? post.requirements
        : Array.isArray(post.requirements) && post.requirements.length > 0
            ? post.requirements.map((item) => String(item)).join("\n")
            : typeof post.qualifications === "string"
                ? post.qualifications
                : "",
    additionalInformation: typeof post.additionalInformation === "string"
        ? post.additionalInformation
        : Array.isArray(post.responsibilities) && post.responsibilities.length > 0
            ? post.responsibilities.join(", ")
            : "",
    skills: typeof post.skills === "string"
        ? post.skills
        : Array.isArray(post.skillsRequired) && post.skillsRequired.length > 0
            ? post.skillsRequired.join(", ")
            : "",
    workMode: post.workMode === "REMOTE"
        ? "Remote"
        : post.workMode === "HYBRID"
            ? "Hybrid"
            : post.workMode === "ON_SITE"
                ? "On site"
                : "On site",
    employmentType: post.employmentType === "FULL_TIME"
        ? "Full-time"
        : post.employmentType === "PART_TIME"
            ? "Part-time"
            : post.employmentType === "CONTRACT"
                ? "Contract"
                : "Full-time",
    closingDate: post.closingDate ? post.closingDate.toISOString().slice(0, 10) : "",
    location: post.location ?? "",
    company: {
        name: post.employer?.companyName ?? "",
        logoUrl: post.employer?.companyLogoUrl ?? null,
    },
    createdAt: post.createdAt ? post.createdAt.toISOString() : undefined,
    updatedAt: post.updatedAt ? post.updatedAt.toISOString() : undefined,
});
const resolveApprovedEmployerId = async (userId) => {
    // IMPORTANT: This function enforces the critical business rule:
    // Only APPROVED employers can manage job posts.
    // Called at the start of EVERY service method to ensure authorization.
    const employerProfile = await jobPosts_repository_1.jobsRepository.findEmployerProfileByUserId(userId);
    if (!employerProfile) {
        // User has no employer profile — not an employer account
        throw buildHttpError("Employer profile not found", 404);
    }
    if (employerProfile.verificationStatus !== client_1.VerificationStatus.APPROVED) {
        // Employer exists but isn't approved yet (PENDING or REJECTED)
        throw buildHttpError("Your company is not approved to manage job posts.", 403);
    }
    // Return the employer ID for use in repository queries
    return employerProfile.id;
};
exports.jobsService = {
    // ═══════════════════════════════════════════════════════════════════════════
    // GET STATS — Returns counts of job posts by status for dashboard cards.
    // Used by employer dashboard to show "Total: X  |  Active: X  |  Draft: X"
    // ═══════════════════════════════════════════════════════════════════════════
    async getStats(userId) {
        // Verify employer is approved — throws 403 or 404 if not
        const employerId = await resolveApprovedEmployerId(userId);
        // Query stats from repository (counts per status)
        const stats = await jobPosts_repository_1.jobsRepository.getStats(employerId);
        // Return dashboard-friendly format: { total, active, draft, closed }
        return {
            total: stats.TOTAL,
            active: stats.ACTIVE,
            draft: stats.DRAFT,
            closed: stats.CLOSED,
            applications: stats.APPLICATIONS,
        };
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // GET JOB POSTS — Returns paginated, filterable list of employer's job posts.
    // Supports filtering by status/type and searching by title.
    // ═══════════════════════════════════════════════════════════════════════════
    async getJobPosts(userId, query) {
        // Verify employer is approved
        const employerId = await resolveApprovedEmployerId(userId);
        // Validate and sanitize pagination params to prevent abuse
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, query.limit ?? DEFAULT_PAGE_LIMIT));
        const search = query.search?.trim() || undefined;
        // Query repository with filter + pagination
        const { posts, total } = await jobPosts_repository_1.jobsRepository.findAll({
            employerId,
            status: query.status, // Filter by DRAFT | ACTIVE | CLOSED
            type: query.type, // Filter by JOB | INTERNSHIP
            search, // Text search in title
            page,
            limit,
        });
        // Transform database posts to DTOs and calculate page metadata
        return {
            data: posts.map(mapToDTO),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // GET JOB POST BY ID — Returns a single job post.
    // IMPORTANT: Only returns post if owned by the employer (ownership check).
    // ═══════════════════════════════════════════════════════════════════════════
    async getJobPostById(userId, postId) {
        // Verify employer is approved
        const employerId = await resolveApprovedEmployerId(userId);
        // Query repository with ownership filter built into the WHERE clause
        const post = await jobPosts_repository_1.jobsRepository.findById(postId, employerId);
        if (!post) {
            // Either post doesn't exist or employer doesn't own it
            throw buildHttpError("Job post not found", 404);
        }
        // Transform to DTO and return
        return mapToDTO(post);
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // CREATE JOB POST — Creates a new job post.
    // Only approved employers can create posts. Defaults to DRAFT status.
    // ═══════════════════════════════════════════════════════════════════════════
    async createJobPost(userId, data) {
        // Verify employer is approved — throws 403 if not
        const employerId = await resolveApprovedEmployerId(userId);
        // Insert new post into database (repository handles defaults)
        const created = await jobPosts_repository_1.jobsRepository.create(employerId, data);
        // Transform and return with company context
        return {
            ...mapToDTO(created),
            company: { name: "" },
        };
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE JOB POST — Partially updates a job post (PATCH).
    // Only updates fields provided in data. Ownership verified via findById.
    // Can be used to update title, description, status, etc.
    // ═══════════════════════════════════════════════════════════════════════════
    async updateJobPost(userId, postId, data) {
        // Verify employer is approved
        const employerId = await resolveApprovedEmployerId(userId);
        // Check if post exists AND belongs to this employer before updating
        const existing = await jobPosts_repository_1.jobsRepository.findById(postId, employerId);
        if (!existing) {
            // Either post doesn't exist or employer doesn't own it
            throw buildHttpError("Job post not found", 404);
        }
        // Update post in database (only provided fields are changed)
        const updated = await jobPosts_repository_1.jobsRepository.update(postId, employerId, data);
        return {
            ...mapToDTO(updated),
            company: { name: "" },
        };
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE JOB POST — Permanently deletes a job post.
    // Ownership verified via findById before deletion.
    // This operation is IRREVERSIBLE — no recovery possible.
    // ═══════════════════════════════════════════════════════════════════════════
    async deleteJobPost(userId, postId) {
        // Verify employer is approved
        const employerId = await resolveApprovedEmployerId(userId);
        // Check if post exists AND belongs to this employer before deleting
        const existing = await jobPosts_repository_1.jobsRepository.findById(postId, employerId);
        if (!existing) {
            // Either post doesn't exist or employer doesn't own it
            throw buildHttpError("Job post not found", 404);
        }
        if (existing.status === client_1.PostStatus.ACTIVE) {
            throw buildHttpError("Active job posts cannot be deleted. Please close the post first.", 409);
        }
        // Permanently delete the post from database
        await jobPosts_repository_1.jobsRepository.deleteById(postId, employerId);
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // GET APPLICATIONS FOR JOB POST — Returns all candidates who applied for this post.
    // Used by the candidates page to display applicants for a specific job post.
    // ═══════════════════════════════════════════════════════════════════════════
    async getApplicationsByJobPost(userId, jobPostId, status) {
        // Verify employer is approved
        const employerId = await resolveApprovedEmployerId(userId);
        // Fetch applications from repository
        const applications = await jobPosts_repository_1.jobsRepository.findApplicationsByJobPost(jobPostId, employerId, status);
        // Format applications into candidate format for frontend
        return applications.map((app) => ({
            id: app.candidateProfile.id,
            name: `${app.candidateProfile.user.firstName} ${app.candidateProfile.user.lastName}`,
            email: app.candidateProfile.user.email,
            headline: app.candidateProfile.headline || "",
            skills: app.candidateProfile.skills || [],
            status: app.applicationStatus, // PENDING, SHORTLISTED, REJECTED
            appliedAt: app.appliedAt.toISOString(),
            cvUrl: app.cvUrl,
            aiScore: app.aiScore || 0,
        }));
    },
};
//# sourceMappingURL=jobPosts.service.js.map