"use strict";
// Service layer for authentication, registration, login, token, and password reset logic.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const auth_repository_1 = require("./auth.repository");
const auth_validation_1 = require("./auth.validation");
const crypto_2 = require("crypto");
const db_1 = require("../../config/db");
const email_1 = require("../../utils/email");
const env_1 = require("../../config/env");
const jwt_1 = require("../../utils/jwt");
// OAUTH STATE SECRET is used to sign the state parameter for OAuth flows to prevent CSRF attacks.
const OAUTH_STATE_SECRET = `${env_1.env.JWT_SECRET}_oauth_state`;
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const assertOAuthRoleCompatibility = (existingRole, requestedRole) => {
    if (existingRole === requestedRole)
        return;
    if (existingRole === "STUDENT" || existingRole === "PROFESSIONAL") {
        throw new Error(`This Google account is already registered as ${existingRole}. Please continue with ${existingRole} or use a different Google account.`);
    }
    throw new Error("This Google account is already linked to a restricted account type.");
};
const generateAccessToken = (userId, role) => {
    return (0, jwt_1.generateAccessToken)({ userId, role });
};
const hashToken = (token) => {
    return (0, crypto_2.createHash)("sha256").update(token).digest("hex");
};
const generateRefreshToken = async (userId) => {
    const token = (0, jwt_1.generateRefreshToken)({ userId });
    const hashedToken = hashToken(token);
    await auth_repository_1.authRepository.createRefreshToken({
        token: hashedToken,
        userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return token;
};
const buildSessionUser = (user) => ({
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    preferences: {
        locale: "en",
        theme: "light",
    },
    permissions: [user.role],
    employerProfile: user.employerProfile
        ? {
            companyName: user.employerProfile.companyName,
            companyLogoUrl: user.employerProfile.companyLogoUrl ?? null,
            verificationStatus: user.employerProfile.verificationStatus,
            rejectionReason: user.employerProfile.rejectionReason ?? null,
        }
        : null,
});
// Issues access and refresh tokens for a given user ID and role.(Access token is short-lived, refresh token is long-lived and stored in DB for rotation and revocation)
const issueTokensForUser = async (userId, role) => {
    const accessToken = generateAccessToken(userId, role);
    const refreshToken = await generateRefreshToken(userId);
    return { accessToken, refreshToken };
};
const validateOAuthRole = (role) => {
    const normalized = String(role || "").toUpperCase();
    if (normalized !== "STUDENT" && normalized !== "PROFESSIONAL") {
        throw new Error("Invalid role for OAuth signup.");
    }
    return normalized;
};
const createOAuthState = (provider, role) => {
    return jsonwebtoken_1.default.sign({ provider, role }, OAUTH_STATE_SECRET, { expiresIn: "10m" });
};
const parseOAuthState = (state) => {
    const payload = jsonwebtoken_1.default.verify(state, OAUTH_STATE_SECRET);
    if (!payload.provider || !payload.role) {
        throw new Error("Invalid OAuth state payload");
    }
    if (payload.provider !== "google" && payload.provider !== "linkedin") {
        throw new Error("Invalid OAuth provider in state");
    }
    if (payload.role !== "STUDENT" && payload.role !== "PROFESSIONAL") {
        throw new Error("Invalid OAuth role in state");
    }
    return { provider: payload.provider, role: payload.role };
};
//OAuth ends here
exports.authService = {
    async getCurrentUser(userId) {
        const user = await auth_repository_1.authRepository.findUserById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        return {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName ?? null,
            lastName: user.lastName ?? null,
            preferences: {
                locale: "en",
                theme: "light",
            },
            permissions: [user.role],
            employerProfile: user.employerProfile
                ? {
                    companyName: user.employerProfile.companyName,
                    companyLogoUrl: user.employerProfile.companyLogoUrl ?? null,
                    verificationStatus: user.employerProfile.verificationStatus,
                    rejectionReason: user.employerProfile.rejectionReason,
                }
                : null,
        };
    },
    async upgradeCurrentUserRole(userId, targetRole) {
        const user = await auth_repository_1.authRepository.findUserById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        if (user.role === "EMPLOYER" || user.role === "ADMIN") {
            throw new Error("This account type cannot be changed.");
        }
        if (user.role === targetRole) {
            return this.getCurrentUser(userId);
        }
        if (user.role !== "STUDENT" || targetRole !== "PROFESSIONAL") {
            throw new Error("Only Undergraduate to Professional upgrade is allowed.");
        }
        await auth_repository_1.authRepository.updateUserRole(userId, targetRole);
        return this.getCurrentUser(userId);
    },
    async registerUser(data) {
        const normalizedEmail = String(data.email || "").trim().toLowerCase();
        const existing = await auth_repository_1.authRepository.findUserByEmail(normalizedEmail);
        if (existing)
            throw new Error("User already exists");
        // Only allow STUDENT or PROFESSIONAL roles
        const allowedRoles = ["STUDENT", "PROFESSIONAL"];
        const requestedRole = (data.role || "").toUpperCase();
        if (!allowedRoles.includes(requestedRole)) {
            throw new Error("Invalid role. Only STUDENT or PROFESSIONAL registration allowed.");
        }
        const hashed = await bcrypt_1.default.hash(data.password, 10);
        const user = await auth_repository_1.authRepository.createUser({
            firstName: data.firstName,
            lastName: data.lastName,
            email: normalizedEmail,
            password: hashed,
            role: requestedRole,
        });
        return issueTokensForUser(user.id, user.role);
    },
    async registerEmployer(data) {
        const normalizedEmail = String(data.email || "").trim().toLowerCase();
        const existing = await auth_repository_1.authRepository.findUserByEmail(normalizedEmail);
        if (existing)
            throw new Error("User already exists");
        if (!data.registrationFileUrl || !data.registrationFileName) {
            throw new Error("Business registration PDF is required");
        }
        const hashed = await bcrypt_1.default.hash(data.password, 10);
        await db_1.prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: normalizedEmail,
                    password: hashed,
                    role: "EMPLOYER",
                },
            });
            await tx.employerProfile.create({
                data: {
                    userId: user.id,
                    companyName: data.companyName,
                    registrationFileUrl: data.registrationFileUrl,
                    registrationFileName: data.registrationFileName,
                },
            });
            return user;
        });
        const created = await auth_repository_1.authRepository.findUserByEmail(normalizedEmail);
        return {
            message: "Registration successful. Await admin approval.",
            userId: created.id,
        };
    },
    async login(data) {
        const normalizedEmail = String(data.email || "").trim();
        const user = await auth_repository_1.authRepository.findUserByEmail(normalizedEmail);
        if (!user || !user.password)
            throw new Error("Invalid credentials");
        const match = await bcrypt_1.default.compare(data.password, user.password);
        if (!match)
            throw new Error("Invalid credentials");
        if (user.role === "EMPLOYER") {
            if (!user.employerProfile) {
                throw new Error("Employer profile missing. Please contact support.");
            }
            const verificationStatus = String(user.employerProfile.verificationStatus || "").toUpperCase();
            if (verificationStatus !== "APPROVED") {
                if (verificationStatus === "REJECTED") {
                    const reason = user.employerProfile.rejectionReason?.trim();
                    throw new Error(reason
                        ? `Employer account was rejected: ${reason}`
                        : "Employer account was rejected by admin.");
                }
                throw new Error("Account pending admin approval");
            }
        }
        const tokens = await issueTokensForUser(user.id, user.role);
        return {
            ...tokens,
            user: buildSessionUser(user),
        };
    },
    async refresh(token) {
        const hashedToken = hashToken(token);
        const stored = await auth_repository_1.authRepository.findRefreshToken(hashedToken);
        if (!stored || stored.isRevoked) {
            throw new Error("Invalid refresh token");
        }
        if (stored.expiresAt < new Date()) {
            throw new Error("Refresh token expired");
        }
        // Revoke old refresh token (rotation)
        await auth_repository_1.authRepository.revokeRefreshToken(stored.token);
        const payload = (0, jwt_1.verifyRefreshToken)(token);
        // Issue new refresh token
        const newRefreshToken = await generateRefreshToken(payload.userId);
        // Fetch the user to get the real role
        const user = await auth_repository_1.authRepository.findUserById(payload.userId);
        if (!user)
            throw new Error("User not found");
        return {
            accessToken: generateAccessToken(payload.userId, user.role),
            refreshToken: newRefreshToken,
            user: buildSessionUser(user),
        };
    },
    async logout(token) {
        await auth_repository_1.authRepository.revokeRefreshToken(hashToken(token));
        return { message: "Logged out successfully" };
    },
    async forgotPassword(email) {
        const user = await auth_repository_1.authRepository.findUserByEmail(email);
        if (!user)
            return { message: "If email exists, reset link sent" };
        // Invalidate any previous reset tokens for this user
        await auth_repository_1.authRepository.deleteOldPasswordResetTokens(user.id);
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        const hashedResetToken = hashToken(resetToken);
        await auth_repository_1.authRepository.createPasswordResetToken({
            token: hashedResetToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        });
        await (0, email_1.sendPasswordResetEmail)(email, resetToken);
        return { message: "If email exists, reset link sent" };
    },
    async resetPassword(token, newPassword) {
        (0, auth_validation_1.validateResetPassword)(newPassword);
        const hashedToken = hashToken(token);
        const stored = await auth_repository_1.authRepository.findPasswordResetToken(hashedToken);
        if (!stored || stored.expiresAt < new Date()) {
            throw new Error("Invalid or expired token");
        }
        const hashed = await bcrypt_1.default.hash(newPassword, 10);
        // Update user password
        await auth_repository_1.authRepository.updateUserPassword(stored.userId, hashed);
        await auth_repository_1.authRepository.deletePasswordResetToken(hashedToken);
        return { message: "Password reset successful" };
    },
    async approveEmployer(userId) {
        await auth_repository_1.authRepository.approveEmployer(userId);
        return { message: "Employer approved successfully" };
    },
    async rejectEmployer(userId, reason) {
        await auth_repository_1.authRepository.rejectEmployer(userId, reason);
        return { message: "Employer rejected" };
    },
    async getEmployersByStatus(status) {
        return auth_repository_1.authRepository.getEmployersByStatus(status);
    },
    async getPendingEmployers() {
        return auth_repository_1.authRepository.getPendingEmployers();
    },
    //Oauth methods here
    createOAuthState(provider, role) {
        const validatedRole = validateOAuthRole(role);
        return createOAuthState(provider, validatedRole);
    },
    async completeOAuthCallback(provider, state, oauthPayload) {
        if (!state) {
            throw new Error("Missing OAuth state");
        }
        const parsedState = parseOAuthState(state);
        if (parsedState.provider !== provider) {
            throw new Error("OAuth provider mismatch in callback");
        }
        if (!oauthPayload.providerUserId || !oauthPayload.email) {
            throw new Error("OAuth response is missing required profile fields");
        }
        const normalizedEmail = normalizeEmail(oauthPayload.email);
        const providerEnum = provider === "google" ? "GOOGLE" : "LINKEDIN";
        const existingAuth = await auth_repository_1.authRepository.findAuthAccount(providerEnum, oauthPayload.providerUserId);
        let user = existingAuth?.user ?? null;
        if (user) {
            assertOAuthRoleCompatibility(user.role, parsedState.role);
        }
        if (!user) {
            const existingByEmail = await auth_repository_1.authRepository.findUserByEmail(normalizedEmail);
            if (existingByEmail) {
                assertOAuthRoleCompatibility(existingByEmail.role, parsedState.role);
                user = existingByEmail;
            }
            else {
                const createdUser = await auth_repository_1.authRepository.createUser({
                    firstName: oauthPayload.firstName,
                    lastName: oauthPayload.lastName,
                    email: normalizedEmail,
                    password: null,
                    role: parsedState.role,
                    isVerified: true,
                });
                user = await auth_repository_1.authRepository.findUserById(createdUser.id);
            }
            if (!user) {
                throw new Error("Failed to create OAuth user");
            }
            await auth_repository_1.authRepository.createAuthAccount({
                userId: user.id,
                provider: providerEnum,
                providerUserId: oauthPayload.providerUserId,
                accessToken: oauthPayload.accessToken || null,
                refreshToken: oauthPayload.refreshToken || null,
                expiresAt: oauthPayload.expiresIn
                    ? new Date(Date.now() + oauthPayload.expiresIn * 1000)
                    : undefined,
            });
        }
        else {
            await auth_repository_1.authRepository.updateAuthAccountTokens(providerEnum, oauthPayload.providerUserId, {
                accessToken: oauthPayload.accessToken || null,
                refreshToken: oauthPayload.refreshToken || null,
                expiresAt: oauthPayload.expiresIn
                    ? new Date(Date.now() + oauthPayload.expiresIn * 1000)
                    : null,
            });
        }
        if (!user) {
            throw new Error("OAuth user not found");
        }
        const tokens = await issueTokensForUser(user.id, user.role);
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
            },
        };
    },
};
//# sourceMappingURL=auth.service.js.map