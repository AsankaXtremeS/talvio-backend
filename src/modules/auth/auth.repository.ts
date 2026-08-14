// Repository functions for user, employer, refresh token, and password reset token database operations.
import { prisma } from "../../config/db";

export const authRepository = {
  findUserByEmail(email: string) {
    const normalizedEmail = email.trim();
    return prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      include: { employerProfile: true, candidateProfile: true },
    });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: { employerProfile: true, candidateProfile: true },
    });
  },

 // Finds a user by their associated OAuth provider and provider user ID.

  findAuthAccount(provider: "GOOGLE" | "LINKEDIN", providerUserId: string) {
    return prisma.authAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
      include: {
        user: {
          include: { employerProfile: true, candidateProfile: true },
        },
      },
    });
  },

  createAuthAccount(data: {
    userId: string;
    provider: "GOOGLE" | "LINKEDIN";
    providerUserId: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresAt?: Date;
  }) {
    return prisma.authAccount.create({ data });
  },

  updateAuthAccountTokens(
    provider: "GOOGLE" | "LINKEDIN",
    providerUserId: string,
    data: {
      accessToken?: string | null;
      refreshToken?: string | null;
      expiresAt?: Date | null;
    }
  ) {
    return prisma.authAccount.update({
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
    return prisma.user.findMany({
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

  getEmployersByStatus(status: "pending" | "approved" | "rejected") {
    const statusMap = {
      pending: "PENDING",
      approved: "APPROVED",
      rejected: "REJECTED",
    } as const;

    return prisma.user.findMany({
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

  rejectEmployer(userId: string, reason?: string) {
    return prisma.employerProfile.update({
      where: { userId },
      data: {
        verificationStatus: 'REJECTED',
        rejectionReason: reason?.trim() || null,
      } as any,
    });
  },

  createUser(data: any) {
    return prisma.user.create({ data });
  },

  createEmployerProfile(data: any) {
    return prisma.employerProfile.create({ data });
  },

  createRefreshToken(data: any) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshToken(token: string) {
    // token is now always hashed
    return prisma.refreshToken.findUnique({ where: { token } });
  },

  revokeRefreshToken(token: string) {
    return prisma.refreshToken.updateMany({
      where: { token },
      data: { isRevoked: true },
    });
  },

  approveEmployer(userId: string) {
    return prisma.employerProfile.update({
      where: { userId },
      data: {
        verificationStatus: "APPROVED",
        rejectionReason: null,
      } as any,
    });
  },

  createPasswordResetToken(data: any) {
    return prisma.passwordResetToken.create({ data });
  },

  deleteOldPasswordResetTokens(userId: string) {
    return prisma.passwordResetToken.deleteMany({ where: { userId } });
  },

  findPasswordResetToken(token: string) {
    // token is now always hashed
    return prisma.passwordResetToken.findUnique({ where: { token } });
  },

  deletePasswordResetToken(token: string) {
    return prisma.passwordResetToken.delete({ where: { token } });
  },

  updateUserPassword(userId: string, password: string) {
    return prisma.user.update({ where: { id: userId }, data: { password } });
  },

  updateUserRole(userId: string, role: "STUDENT" | "PROFESSIONAL" | "EMPLOYER" | "ADMIN") {
    return prisma.user.update({ where: { id: userId }, data: { role } });
  },
};