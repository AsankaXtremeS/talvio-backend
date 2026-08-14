"use strict";
// Repository layer for employer job post management.
// Responsible ONLY for database access — no business logic lives here.
// All queries are built with Prisma and typed explicitly.
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsRepository = void 0;
const db_1 = require("../../../config/db");
const client_1 = require("@prisma/client");
const toNullableString = (value) => {
    if (value === undefined)
        return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};
const toStringArray = (value) => {
    if (value === undefined || value === null)
        return [];
    const normalized = String(value).trim();
    if (normalized.length === 0)
        return [];
    return normalized
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
};
const toWorkMode = (value) => {
    if (value === "Remote")
        return "REMOTE";
    if (value === "Hybrid")
        return "HYBRID";
    if (value === "On site")
        return "ON_SITE";
    return null;
};
const toEmploymentType = (value) => {
    if (value === "Full-time")
        return "FULL_TIME";
    if (value === "Part-time")
        return "PART_TIME";
    if (value === "Contract")
        return "CONTRACT";
    return null;
};
let closingDateSchemaChecked = false;
let closingDateSchemaCheckPromise = null;
async function ensureClosingDateColumnCompatibility() {
    if (closingDateSchemaChecked)
        return;
    if (closingDateSchemaCheckPromise)
        return closingDateSchemaCheckPromise;
    closingDateSchemaCheckPromise = (async () => {
        try {
            const closingColumn = (await db_1.prisma.$queryRawUnsafe(`SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'JobPost'
           AND column_name = 'closingDate'
         LIMIT 1;`));
            if (closingColumn.length > 0) {
                closingDateSchemaChecked = true;
                return;
            }
            const closedColumn = (await db_1.prisma.$queryRawUnsafe(`SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'JobPost'
           AND column_name = 'closedDate'
         LIMIT 1;`));
            if (closedColumn.length > 0) {
                await db_1.prisma.$executeRawUnsafe('ALTER TABLE "JobPost" RENAME COLUMN "closedDate" TO "closingDate";');
            }
            else {
                await db_1.prisma.$executeRawUnsafe('ALTER TABLE "JobPost" ADD COLUMN "closingDate" TIMESTAMP(3);');
            }
            closingDateSchemaChecked = true;
        }
        finally {
            closingDateSchemaCheckPromise = null;
        }
    })();
    return closingDateSchemaCheckPromise;
}
exports.jobsRepository = {
    // ═══════════════════════════════════════════════════════════════════════════
    // FIND EMPLOYER PROFILE — Used to verify employer exists and is approved.
    // Called by service layer to check if user has an employer account.
    // ═══════════════════════════════════════════════════════════════════════════
    async findEmployerProfileByUserId(userId) {
        // Query employer profile by user ID; only fetch id and verification status
        return db_1.prisma.employerProfile.findUnique({
            where: { userId },
            select: {
                id: true,
                verificationStatus: true,
            },
        });
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // FIND ALL JOB POSTS — Returns paginated, filtered list of job posts.
    // Supports filtering by status, type, and text search in title.
    // IMPORTANT: Always filters by employerId to ensure data isolation.
    // ═══════════════════════════════════════════════════════════════════════════
    async findAll(options) {
        // Ensure 'closingDate' column exists (schema migration for backward compatibility)
        await ensureClosingDateColumnCompatibility();
        const { employerId, status, type, search, page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        // Build WHERE clause dynamically: always includes employerId, optionally includes filters
        const where = {
            employerId, // CRITICAL: Filter by owner employer
            ...(status ? { status: status } : {}), // Optional: Filter by status
            ...(type ? { type: type } : {}), // Optional: Filter by type (JOB/INTERNSHIP)
            ...(search ? { title: { contains: search, mode: "insensitive" } } : {}), // Optional: Search title
        };
        // Execute count and find in parallel for efficiency
        const [total, posts] = await Promise.all([
            db_1.prisma.jobPost.count({ where }),
            db_1.prisma.jobPost.findMany({
                where,
                orderBy: { createdAt: "desc" }, // Newest posts first
                skip,
                take: limit,
                select: {
                    id: true,
                    title: true,
                    type: true,
                    status: true,
                    description: true,
                    responsibilities: true,
                    requirements: true,
                    additionalInformation: true,
                    skillsRequired: true,
                    workMode: true,
                    employmentType: true,
                    location: true,
                    closingDate: true,
                    createdAt: true,
                    updatedAt: true,
                    employer: {
                        select: {
                            id: true,
                            companyName: true,
                            companyLogoUrl: true,
                        },
                    },
                    _count: {
                        select: {
                            applications: true,
                        },
                    },
                },
            }),
        ]);
        return { posts, total };
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // GET STATS — Returns count of job posts by status.
    // Used by dashboard to show: Total | Active | Draft | Closed
    // ═══════════════════════════════════════════════════════════════════════════
    async getStats(employerId) {
        await ensureClosingDateColumnCompatibility();
        // Count posts per status and count related applications for this employer's posts.
        const [stats, applications] = await Promise.all([
            db_1.prisma.jobPost.groupBy({
                by: ["status"],
                where: { employerId },
                _count: { id: true },
            }),
            db_1.prisma.application.count({
                where: {
                    jobPost: {
                        employerId,
                    },
                },
            }),
        ]);
        // Initialize result object with all statuses
        const result = { DRAFT: 0, ACTIVE: 0, CLOSED: 0, TOTAL: 0, APPLICATIONS: applications };
        // Populate with counts from query results
        for (const row of stats) {
            result[row.status] = row._count.id;
            result.TOTAL += row._count.id;
        }
        return result;
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // FIND BY ID — Returns a single job post by ID.
    // IMPORTANT: WHERE clause includes employerId to enforce ownership.
    // CRITICAL: If post exists but doesn't belong to employerId, returns null.
    // ═══════════════════════════════════════════════════════════════════════════
    async findById(id, employerId) {
        await ensureClosingDateColumnCompatibility();
        // findFirst with two WHERE conditions: both id AND employerId must match
        return db_1.prisma.jobPost.findFirst({
            where: {
                id,
                employerId, // CRITICAL: Ownership check
            },
            select: {
                id: true,
                title: true,
                type: true,
                status: true,
                description: true,
                responsibilities: true,
                requirements: true,
                additionalInformation: true,
                skillsRequired: true,
                workMode: true,
                employmentType: true,
                location: true,
                closingDate: true,
                createdAt: true,
                updatedAt: true,
                employer: {
                    select: {
                        id: true,
                        companyName: true,
                        companyLogoUrl: true,
                    },
                },
                _count: {
                    select: {
                        applications: true,
                    },
                },
            },
        });
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // CREATE — Inserts a new job post into the database.
    // Defaults to ACTIVE status if not specified.
    // ═══════════════════════════════════════════════════════════════════════════
    async create(employerId, data) {
        await ensureClosingDateColumnCompatibility();
        // Map frontend fields to currently generated Prisma schema
        const createPayload = {
            title: data.title,
            type: data.type === "Job" ? client_1.JobType.JOB : client_1.JobType.INTERNSHIP,
            description: toNullableString(data.description),
            responsibilities: toStringArray(data.responsibilities),
            requirements: toStringArray(data.requirements),
            skillsRequired: toStringArray(data.skills),
            additionalInformation: toNullableString(data.additionalInformation),
            workMode: toWorkMode(data.workMode),
            employmentType: toEmploymentType(data.employmentType),
            location: toNullableString(data.location),
            closingDate: data.closingDate ? new Date(data.closingDate) : null,
            status: data.status === "Draft"
                ? client_1.PostStatus.DRAFT
                : data.status === "Closed"
                    ? client_1.PostStatus.CLOSED
                    : client_1.PostStatus.ACTIVE,
            employerId,
        };
        try {
            return await db_1.prisma.jobPost.create({
                data: createPayload,
                select: {
                    id: true,
                    title: true,
                    type: true,
                    status: true,
                    description: true,
                    responsibilities: true,
                    requirements: true,
                    additionalInformation: true,
                    skillsRequired: true,
                    workMode: true,
                    employmentType: true,
                    location: true,
                    closingDate: true,
                    createdAt: true,
                    updatedAt: true,
                    employer: {
                        select: {
                            id: true,
                            companyName: true,
                        },
                    },
                    _count: {
                        select: {
                            applications: true,
                        },
                    },
                },
            });
        }
        catch (err) {
            // Backward-compatibility: handle old schema with NOT NULL department column
            const message = err instanceof Error ? err.message : String(err);
            if (message.toLowerCase().includes("department")) {
                await db_1.prisma.$executeRawUnsafe("ALTER TABLE \"JobPost\" ALTER COLUMN \"department\" SET DEFAULT 'General';");
                return db_1.prisma.jobPost.create({
                    data: createPayload,
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        status: true,
                        description: true,
                        responsibilities: true,
                        requirements: true,
                        additionalInformation: true,
                        skillsRequired: true,
                        workMode: true,
                        employmentType: true,
                        location: true,
                        closingDate: true,
                        createdAt: true,
                        updatedAt: true,
                        employer: {
                            select: {
                                id: true,
                                companyName: true,
                            },
                        },
                        _count: {
                            select: {
                                applications: true,
                            },
                        },
                    },
                });
            }
            throw err;
        }
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE — Partially updates a job post.
    // Only updates fields that are provided (all fields optional for partial PATCH).
    // IMPORTANT: WHERE clause includes employerId to prevent cross-employer updates.
    // ═══════════════════════════════════════════════════════════════════════════
    async update(id, employerId, data) {
        await ensureClosingDateColumnCompatibility();
        // Use updateMany to allow filtering by employerId alongside id for security.
        // Then fetch the updated row because updateMany only returns a count.
        const result = await db_1.prisma.jobPost.updateMany({
            where: {
                id,
                employerId, // CRITICAL: Now securely checking ownership
            },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.type !== undefined && {
                    type: data.type === "Job" ? client_1.JobType.JOB : client_1.JobType.INTERNSHIP,
                }),
                ...(data.description !== undefined && { description: toNullableString(data.description) }),
                ...(data.responsibilities !== undefined && {
                    responsibilities: toStringArray(data.responsibilities),
                }),
                ...(data.requirements !== undefined && { requirements: toStringArray(data.requirements) }),
                ...(data.skills !== undefined && {
                    skillsRequired: toStringArray(data.skills),
                }),
                ...(data.additionalInformation !== undefined && {
                    additionalInformation: toNullableString(data.additionalInformation),
                }),
                ...(data.workMode !== undefined && { workMode: toWorkMode(data.workMode) }),
                ...(data.employmentType !== undefined && {
                    employmentType: toEmploymentType(data.employmentType),
                }),
                ...(data.location !== undefined && { location: toNullableString(data.location) }),
                ...(data.closingDate !== undefined && {
                    closingDate: data.closingDate ? new Date(data.closingDate) : null,
                }),
                ...(data.status !== undefined && {
                    status: data.status === "Active"
                        ? client_1.PostStatus.ACTIVE
                        : data.status === "Draft"
                            ? client_1.PostStatus.DRAFT
                            : data.status === "Closed"
                                ? client_1.PostStatus.CLOSED
                                : client_1.PostStatus.DRAFT,
                }),
            },
        });
        if (result.count === 0) {
            throw new Error("Job post not found");
        }
        const updated = await db_1.prisma.jobPost.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                type: true,
                status: true,
                description: true,
                responsibilities: true,
                requirements: true,
                additionalInformation: true,
                skillsRequired: true,
                workMode: true,
                employmentType: true,
                location: true,
                closingDate: true,
                createdAt: true,
                updatedAt: true,
                employer: {
                    select: {
                        id: true,
                        companyName: true,
                    },
                },
                _count: {
                    select: {
                        applications: true,
                    },
                },
            },
        });
        if (!updated) {
            throw new Error("Job post not found");
        }
        return updated;
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // DELETE BY ID — Permanently deletes a job post.
    // IMPORTANT: WHERE clause includes employerId to prevent cross-employer deletion.
    // CRITICAL: This operation is IRREVERSIBLE — no recovery possible.
    // ═══════════════════════════════════════════════════════════════════════════
    async deleteById(id, employerId) {
        await ensureClosingDateColumnCompatibility();
        // Use deleteMany to allow filtering by employerId alongside id for security
        return db_1.prisma.jobPost.deleteMany({
            where: {
                id,
                employerId, // CRITICAL: Now securely checking ownership
            },
        });
    },
    // ═══════════════════════════════════════════════════════════════════════════
    // GET APPLICATIONS FOR JOB POST — Returns all candidates who applied for this post.
    // Filters by status if provided.
    // IMPORTANT: WHERE clause includes employerId to ensure the employer owns the job post.
    // ═══════════════════════════════════════════════════════════════════════════
    async findApplicationsByJobPost(jobPostId, employerId, status) {
        // First verify the job post belongs to this employer
        const jobPost = await db_1.prisma.jobPost.findFirst({
            where: { id: jobPostId, employerId },
            select: { id: true },
        });
        if (!jobPost) {
            return [];
        }
        // Build WHERE clause for applications
        const where = { jobPostId };
        if (status) {
            where.applicationStatus = status;
        }
        // Fetch all applications for this job post with candidate details
        return db_1.prisma.application.findMany({
            where,
            include: {
                candidateProfile: {
                    select: {
                        id: true,
                        headline: true,
                        skills: true,
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
            orderBy: { appliedAt: "desc" },
        });
    },
};
//# sourceMappingURL=jobPosts.repository.js.map