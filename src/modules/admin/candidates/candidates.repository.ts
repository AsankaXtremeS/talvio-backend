// Repository layer — all DB queries for the candidates module.
// Candidates = users with role STUDENT or PROFESSIONAL.

import { prisma } from "../../../config/db";

export interface GetCandidatesOptions {
  search?: string;
  role?: "STUDENT" | "PROFESSIONAL";
  page?: number;
  limit?: number;
}

export const candidatesRepository = {

  async getStats() {
    const [undergraduates, professionals] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "PROFESSIONAL" } }),
    ]);

    return {
      undergraduates,
      professionals,
    };
  },

  async findAll(options: GetCandidatesOptions = {}) {
    const { search, role, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = {
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
      prisma.user.count({ where }),
      prisma.user.findMany({
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

  async findById(userId: string) {
    return prisma.user.findFirst({
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

  async deleteById(userId: string) {
    return prisma.user.delete({ where: { id: userId } });
  },

  async isCandidate(userId: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { id: userId, role: { in: ["STUDENT", "PROFESSIONAL"] } },
      select: { id: true },
    });
    return user !== null;
  },
};