"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobpostRepository = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../../../config/db");
const adminJobPostSelect = client_1.Prisma.validator()({
    id: true,
    title: true,
    type: true,
    status: true,
    employmentType: true,
    closingDate: true,
    createdAt: true,
    description: true,
    _count: {
        select: {
            applications: true,
        },
    },
    employer: {
        select: {
            companyName: true,
            user: {
                select: {
                    email: true,
                },
            },
        },
    },
});
exports.jobpostRepository = {
    async getStats() {
        const [internshipPosts, jobPosts, internshipCompanyRows, jobCompanyRows] = await Promise.all([
            db_1.prisma.jobPost.count({ where: { type: "INTERNSHIP" } }),
            db_1.prisma.jobPost.count({ where: { type: "JOB" } }),
            db_1.prisma.jobPost.findMany({
                where: { type: "INTERNSHIP" },
                distinct: ["employerId"],
                select: { employerId: true },
            }),
            db_1.prisma.jobPost.findMany({
                where: { type: "JOB" },
                distinct: ["employerId"],
                select: { employerId: true },
            }),
        ]);
        return {
            internshipPosts,
            internshipCompanies: internshipCompanyRows.length,
            jobPosts,
            jobCompanies: jobCompanyRows.length,
        };
    },
    async findAll(options = {}) {
        const { search, page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        const where = search
            ? {
                OR: [
                    { title: { contains: search, mode: "insensitive" } },
                    {
                        employer: {
                            companyName: { contains: search, mode: "insensitive" },
                        },
                    },
                    {
                        employer: {
                            user: {
                                email: { contains: search, mode: "insensitive" },
                            },
                        },
                    },
                ],
            }
            : {};
        const [total, posts] = await Promise.all([
            db_1.prisma.jobPost.count({ where }),
            db_1.prisma.jobPost.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                select: adminJobPostSelect,
            }),
        ]);
        return { posts, total };
    },
    async findById(id) {
        return db_1.prisma.jobPost.findUnique({
            where: { id },
            select: adminJobPostSelect,
        });
    },
    async deleteById(id) {
        return db_1.prisma.jobPost.delete({ where: { id } });
    },
    async existsById(id) {
        const item = await db_1.prisma.jobPost.findUnique({
            where: { id },
            select: { id: true },
        });
        return item !== null;
    },
};
//# sourceMappingURL=jobpost.repository.js.map