"use strict";
// Repository layer — all DB queries for the candidates module.
// Candidates = users with role STUDENT or PROFESSIONAL.
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidatesRepository = void 0;
const db_1 = require("../../../config/db");
exports.candidatesRepository = {
    async getStats() {
        const [undergraduates, professionals] = await Promise.all([
            db_1.prisma.user.count({ where: { role: "STUDENT" } }),
            db_1.prisma.user.count({ where: { role: "PROFESSIONAL" } }),
        ]);
        return {
            undergraduates,
            professionals,
        };
    },
    async findAll(options = {}) {
        const { search, role, page = 1, limit = 20 } = options;
        const skip = (page - 1) * limit;
        const where = {
            role: role ? role : { in: ["STUDENT", "PROFESSIONAL"] },
            ...(search
                ? {
                    OR: [
                        { firstName: { contains: search, mode: "insensitive" } },
                        { lastName: { contains: search, mode: "insensitive" } },
                        { email: { contains: search, mode: "insensitive" } },
                    ],
                }
                : {}),
        };
        const [total, candidates] = await Promise.all([
            db_1.prisma.user.count({ where }),
            db_1.prisma.user.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isVerified: true,
                    createdAt: true,
                    authAccounts: {
                        select: { provider: true },
                    },
                },
            }),
        ]);
        return { candidates, total };
    },
    async findById(userId) {
        return db_1.prisma.user.findFirst({
            where: {
                id: userId,
                role: { in: ["STUDENT", "PROFESSIONAL"] },
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isVerified: true,
                createdAt: true,
                authAccounts: {
                    select: { provider: true },
                },
            },
        });
    },
    async deleteById(userId) {
        return db_1.prisma.user.delete({ where: { id: userId } });
    },
    async isCandidate(userId) {
        const user = await db_1.prisma.user.findFirst({
            where: { id: userId, role: { in: ["STUDENT", "PROFESSIONAL"] } },
            select: { id: true },
        });
        return user !== null;
    },
};
//# sourceMappingURL=candidates.repository.js.map