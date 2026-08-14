"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jobsRepository = void 0;
const db_1 = require("../../../config/db");
exports.jobsRepository = {
    // Get jobs created in the last 24 hours
    findNewJobsByType: async (type) => {
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        return db_1.prisma.jobPost.findMany({
            where: {
                status: "ACTIVE",
                type: type,
                createdAt: {
                    gte: yesterday,
                },
            },
            include: {
                employer: {
                    select: {
                        companyName: true,
                        companyLogoUrl: true,
                        companyLocation: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
    },
    // Get all ACTIVE job posts filtered by type (JOB or INTERNSHIP)
    findActiveJobsByType: async (type, page, limit) => {
        const skip = (page - 1) * limit;
        const [jobs, total] = await Promise.all([
            db_1.prisma.jobPost.findMany({
                where: {
                    status: "ACTIVE",
                    type: type,
                },
                include: {
                    employer: {
                        select: {
                            companyName: true,
                            companyLogoUrl: true,
                            companyLocation: true,
                            companyDescription: true,
                            companyWebsite: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
                skip,
                take: limit,
            }),
            db_1.prisma.jobPost.count({
                where: {
                    status: "ACTIVE",
                    type: type,
                },
            }),
        ]);
        return { jobs, total };
    },
};
//# sourceMappingURL=jobs.repository.js.map