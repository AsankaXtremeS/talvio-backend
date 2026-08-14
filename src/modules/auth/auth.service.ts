// Service layer for authentication, registration, login, token, and password reset logic.

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { authRepository } from "./auth.repository";
import { validateResetPassword } from "./auth.validation";
import { createHash } from "crypto";
import { prisma } from "../../config/db";
import { sendPasswordResetEmail } from "../../utils/email";
import { env } from "../../config/env";
import {
  generateAccessToken as generateAccessJwt,
  generateRefreshToken as generateRefreshJwt,
  verifyRefreshToken,
} from "../../utils/jwt";
import { OAuthProviderPayload } from "../../config/passport";

// OAUTH STATE SECRET is used to sign the state parameter for OAuth flows to prevent CSRF attacks.
const OAUTH_STATE_SECRET = `${env.JWT_SECRET}_oauth_state`;

type OAuthProvider = "google" | "linkedin";
type OAuthRole = "STUDENT" | "PROFESSIONAL";

const normalizeEmail = (email: string) => String(email || "").trim().toLowerCase();

const assertOAuthRoleCompatibility = (existingRole: string, requestedRole: OAuthRole) => {
  if (existingRole === requestedRole) return;

  if (existingRole === "STUDENT" || existingRole === "PROFESSIONAL") {
    throw new Error(
      `This Google account is already registered as ${existingRole}. Please continue with ${existingRole} or use a different Google account.`
    );
  }

  throw new Error("This Google account is already linked to a restricted account type.");
};

const generateAccessToken = (userId: string, role: string) => {
  return generateAccessJwt({ userId, role });
};

const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

const generateRefreshToken = async (userId: string) => {
  const token = generateRefreshJwt({ userId });
  const hashedToken = hashToken(token);

  await authRepository.createRefreshToken({
    token: hashedToken,
    userId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return token;
};

const buildSessionUser = (user: any) => ({
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
  candidateProfile: user.candidateProfile
    ? {
        profilePictureUrl: user.candidateProfile.profilePictureUrl ?? null,
      }
    : null,
});

// Issues access and refresh tokens for a given user ID and role.(Access token is short-lived, refresh token is long-lived and stored in DB for rotation and revocation)

const issueTokensForUser = async (userId: string, role: string) => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = await generateRefreshToken(userId);
  return { accessToken, refreshToken };
};

const validateOAuthRole = (role: string): OAuthRole => {
  const normalized = String(role || "").toUpperCase();
  if (normalized !== "STUDENT" && normalized !== "PROFESSIONAL") {
    throw new Error("Invalid role for OAuth signup.");
  }
  return normalized;
};

const createOAuthState = (provider: OAuthProvider, role: OAuthRole) => {
  return jwt.sign({ provider, role }, OAUTH_STATE_SECRET, { expiresIn: "10m" });
};

const parseOAuthState = (state: string): { provider: OAuthProvider; role: OAuthRole } => {
  const payload = jwt.verify(state, OAUTH_STATE_SECRET) as { provider?: OAuthProvider; role?: OAuthRole };
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

export const authService = {
  async getCurrentUser(userId: string) {
    const user = await authRepository.findUserById(userId);
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
      candidateProfile: user.candidateProfile
        ? {
            profilePictureUrl: user.candidateProfile.profilePictureUrl ?? null,
          }
        : null,
    };
  },

  async upgradeCurrentUserRole(userId: string, targetRole: "PROFESSIONAL") {
    const user = await authRepository.findUserById(userId);
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

    await authRepository.updateUserRole(userId, targetRole);
    return this.getCurrentUser(userId);
  },

  async registerUser(data: any) {
    const normalizedEmail = String(data.email || "").trim().toLowerCase();
    const existing = await authRepository.findUserByEmail(normalizedEmail);
    if (existing) throw new Error("User already exists");

    // Only allow STUDENT or PROFESSIONAL roles
    const allowedRoles = ["STUDENT", "PROFESSIONAL"];
    const requestedRole = (data.role || "").toUpperCase();
    if (!allowedRoles.includes(requestedRole)) {
      throw new Error("Invalid role. Only STUDENT or PROFESSIONAL registration allowed.");
    }

    const hashed = await bcrypt.hash(data.password, 10);

    const user = await authRepository.createUser({
      firstName: data.firstName,
      lastName: data.lastName,
      email: normalizedEmail,
      password: hashed,
      role: requestedRole,
    });

    return issueTokensForUser(user.id, user.role);
  },

  async registerEmployer(data: any) {
    const normalizedEmail = String(data.email || "").trim().toLowerCase();
    const existing = await authRepository.findUserByEmail(normalizedEmail);
    if (existing) throw new Error("User already exists");

    if (!data.registrationFileUrl || !data.registrationFileName) {
      throw new Error("Business registration PDF is required");
    }

    const hashed = await bcrypt.hash(data.password, 10);

    await prisma.$transaction(async (tx) => {
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

    const created = await authRepository.findUserByEmail(normalizedEmail);
    return {
      message: "Registration successful. Await admin approval.",
      userId: created!.id,
    };
  },

  async login(data: any) {
    const normalizedEmail = String(data.email || "").trim();
    const user = await authRepository.findUserByEmail(normalizedEmail);
    if (!user || !user.password) throw new Error("Invalid credentials");

    const match = await bcrypt.compare(data.password, user.password);
    if (!match) throw new Error("Invalid credentials");

    if (user.role === "EMPLOYER") {
      if (!user.employerProfile) {
        throw new Error("Employer profile missing. Please contact support.");
      }

      const verificationStatus = String(user.employerProfile.verificationStatus || "").toUpperCase();
      if (verificationStatus !== "APPROVED") {
        if (verificationStatus === "REJECTED") {
          const reason = user.employerProfile.rejectionReason?.trim();
          throw new Error(
            reason
              ? `Employer account was rejected: ${reason}`
              : "Employer account was rejected by admin."
          );
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

  async refresh(token: string) {
    const hashedToken = hashToken(token);
    const stored = await authRepository.findRefreshToken(hashedToken);
    if (!stored || stored.isRevoked) {
      throw new Error("Invalid refresh token");
    }
    if (stored.expiresAt < new Date()) {
      throw new Error("Refresh token expired");
    }

    // Revoke old refresh token (rotation)
    await authRepository.revokeRefreshToken(stored.token);

    const payload = verifyRefreshToken(token) as any;
    // Issue new refresh token
    const newRefreshToken = await generateRefreshToken(payload.userId);

    // Fetch the user to get the real role
    const user = await authRepository.findUserById(payload.userId);
    if (!user) throw new Error("User not found");

    return {
      accessToken: generateAccessToken(payload.userId, user.role),
      refreshToken: newRefreshToken,
      user: buildSessionUser(user),
    };
  },

  async logout(token: string) {
    await authRepository.revokeRefreshToken(hashToken(token));
    return { message: "Logged out successfully" };
  },

  async forgotPassword(email: string) {
    const user = await authRepository.findUserByEmail(email);
    if (!user) return { message: "If email exists, reset link sent" };

    // Invalidate any previous reset tokens for this user
    await authRepository.deleteOldPasswordResetTokens(user.id);

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = hashToken(resetToken);

    await authRepository.createPasswordResetToken({
      token: hashedResetToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await sendPasswordResetEmail(email, resetToken);

    return { message: "If email exists, reset link sent" };
  },

  async resetPassword(token: string, newPassword: string) {
    validateResetPassword(newPassword);

    const hashedToken = hashToken(token);
    const stored = await authRepository.findPasswordResetToken(hashedToken);
    if (!stored || stored.expiresAt < new Date()) {
      throw new Error("Invalid or expired token");
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    // Update user password
    await authRepository.updateUserPassword(stored.userId, hashed);

    await authRepository.deletePasswordResetToken(hashedToken);

    return { message: "Password reset successful" };
  },

  async approveEmployer(userId: string) {
    await authRepository.approveEmployer(userId);
    return { message: "Employer approved successfully" };
  },

  async rejectEmployer(userId: string, reason?: string) {
    await authRepository.rejectEmployer(userId, reason);
    return { message: "Employer rejected" };
  },

  async getEmployersByStatus(status: "pending" | "approved" | "rejected") {
    return authRepository.getEmployersByStatus(status);
  },

  async getPendingEmployers() {
    return authRepository.getPendingEmployers();
  },


  //Oauth methods here
  createOAuthState(provider: OAuthProvider, role: string) {
    const validatedRole = validateOAuthRole(role);
    return createOAuthState(provider, validatedRole);
  },

  async completeOAuthCallback(
    provider: OAuthProvider,
    state: string,
    oauthPayload: OAuthProviderPayload
  ) {
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

    const existingAuth = await authRepository.findAuthAccount(
      providerEnum,
      oauthPayload.providerUserId
    );

    let user = existingAuth?.user ?? null;

    if (user) {
      assertOAuthRoleCompatibility(user.role, parsedState.role);
    }

    if (!user) {
      const existingByEmail = await authRepository.findUserByEmail(normalizedEmail);
      if (existingByEmail) {
        assertOAuthRoleCompatibility(existingByEmail.role, parsedState.role);
        user = existingByEmail;
      } else {
        const createdUser = await authRepository.createUser({
          firstName: oauthPayload.firstName,
          lastName: oauthPayload.lastName,
          email: normalizedEmail,
          password: null,
          role: parsedState.role,
          isVerified: true,
        });

        user = await authRepository.findUserById(createdUser.id);
      }

      if (!user) {
        throw new Error("Failed to create OAuth user");
      }

      await authRepository.createAuthAccount({
        userId: user.id,
        provider: providerEnum,
        providerUserId: oauthPayload.providerUserId,
        accessToken: oauthPayload.accessToken || null,
        refreshToken: oauthPayload.refreshToken || null,
        expiresAt: oauthPayload.expiresIn
          ? new Date(Date.now() + oauthPayload.expiresIn * 1000)
          : undefined,
      });
    } else {
      await authRepository.updateAuthAccountTokens(
        providerEnum,
        oauthPayload.providerUserId,
        {
          accessToken: oauthPayload.accessToken || null,
          refreshToken: oauthPayload.refreshToken || null,
          expiresAt: oauthPayload.expiresIn
            ? new Date(Date.now() + oauthPayload.expiresIn * 1000)
            : null,
        }
      );
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