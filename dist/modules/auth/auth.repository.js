"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRepository = void 0;
// Repository functions for user, employer, refresh token, and password reset token database operations.
const db_1 = require("../../config/db");
exports.authRepository = {
    findUserByEmail(email) {
        const normalizedEmail = email.trim();
        return db_1.prisma.user.findFirst({
            where: {
                email: {
                    equals: normalizedEmail,
                    mode: "insensitive",
                },
            },
            include: { employerProfile: true },
        });
    },
    findUserById(id) {
        return db_1.prisma.user.findUnique({
            where: { id },
            include: { employerProfile: true },
        });
    },
    // Finds a user by their associated OAuth provider and provider user ID.
    findAuthAccount(provider, providerUserId) {
        return db_1.prisma.authAccount.findUnique({
            where: {
                provider_providerUserId: {
                    provider,
                    providerUserId,
                },
            },
            include: {
                user: {
                    include: { employerProfile: true },
                },
            },
        });
    },
    createAuthAccount(data) {
        return db_1.prisma.authAccount.create({ data });
    },
    updateAuthAccountTokens(provider, providerUserId, data) {
        return db_1.prisma.authAccount.update({
            where: {
                provider_providerUserId: {
                    provider,
                    providerUserId,
                },
            },
            data,
        });
    },
    //Oauth end here
    getPendingEmployers() {
        return db_1.prisma.user.findMany({
            where: { role: 'EMPLOYER', employerProfile: { verificationStatus: 'PENDING' } },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                email: true,
                createdAt: true,
                employerProfile: {
                    select: {
                        companyName: true,
                        registrationFileUrl: true,
                        registrationFileName: true,
                        verificationStatus: true,
                        rejectionReason: true,
                        createdAt: true,
                    },
                },
            },
        });
    },
    getEmployersByStatus(status) {
        const statusMap = {
            pending: "PENDING",
            approved: "APPROVED",
            rejected: "REJECTED",
        };
        return db_1.prisma.user.findMany({
            where: {
                role: "EMPLOYER",
                employerProfile: { verificationStatus: statusMap[status] },
            },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                email: true,
                createdAt: true,
                employerProfile: {
                    select: {
                        companyName: true,
                        registrationFileUrl: true,
                        registrationFileName: true,
                        verificationStatus: true,
                        rejectionReason: true,
                        createdAt: true,
                    },
                },
            },
        });
    },
    rejectEmployer(userId, reason) {
        return db_1.prisma.employerProfile.update({
            where: { userId },
            data: {
                verificationStatus: 'REJECTED',
                rejectionReason: reason?.trim() || null,
            },
        });
    },
    createUser(data) {
        return db_1.prisma.user.create({ data });
    },
    createEmployerProfile(data) {
        return db_1.prisma.employerProfile.create({ data });
    },
    createRefreshToken(data) {
        return db_1.prisma.refreshToken.create({ data });
    },
    findRefreshToken(token) {
        // token is now always hashed
        return db_1.prisma.refreshToken.findUnique({ where: { token } });
    },
    revokeRefreshToken(token) {
        return db_1.prisma.refreshToken.updateMany({
            where: { token },
            data: { isRevoked: true },
        });
    },
    approveEmployer(userId) {
        return db_1.prisma.employerProfile.update({
            where: { userId },
            data: {
                verificationStatus: "APPROVED",
                rejectionReason: null,
            },
        });
    },
    createPasswordResetToken(data) {
        return db_1.prisma.passwordResetToken.create({ data });
    },
    deleteOldPasswordResetTokens(userId) {
        return db_1.prisma.passwordResetToken.deleteMany({ where: { userId } });
    },
    findPasswordResetToken(token) {
        // token is now always hashed
        return db_1.prisma.passwordResetToken.findUnique({ where: { token } });
    },
    deletePasswordResetToken(token) {
        return db_1.prisma.passwordResetToken.delete({ where: { token } });
    },
    updateUserPassword(userId, password) {
        return db_1.prisma.user.update({ where: { id: userId }, data: { password } });
    },
    updateUserRole(userId, role) {
        return db_1.prisma.user.update({ where: { id: userId }, data: { role } });
    },
};
//# sourceMappingURL=auth.repository.js.map