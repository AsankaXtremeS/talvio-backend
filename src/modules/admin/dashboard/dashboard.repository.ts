import { prisma } from "../../../config/db";

const EXCLUDED_ROLE = "ADMIN" as const;

const buildLastSixMonths = (now: Date): Date[] => {
  const months: Date[] = [];
  for (let i = 5; i >= 0; i -= 1) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  return months;
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 1);

export const dashboardRepository = {
  async getUserRoleCounts() {
    const [undergraduates, professionals, nonAdminUsers] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "PROFESSIONAL" } }),
      prisma.user.count({ where: { role: { not: EXCLUDED_ROLE } } }),
    ]);

    return {
      undergraduates,
      professionals,
      totalUsers: nonAdminUsers,
    };
  },

  async getCompanyCounts() {
    const [totalCompanies, pendingApprovals] = await Promise.all([
      prisma.user.count({
        where: {
          role: "EMPLOYER",
          employerProfile: { verificationStatus: "APPROVED" },
        },
      }),
      prisma.employerProfile.count({ where: { verificationStatus: "PENDING" } }),
    ]);

    return { totalCompanies, pendingApprovals };
  },

  async getUserGrowthSeries() {
    const now = new Date();
    const months = buildLastSixMonths(now);

    const totals = await Promise.all(
      months.map((monthStart) =>
        prisma.user.count({
          where: {
            role: { not: EXCLUDED_ROLE },
            createdAt: { lt: endOfMonth(monthStart) },
          },
        })
      )
    );

    return months.map((monthStart, index) => ({ monthStart, totalUsers: totals[index] }));
  },

  async getCandidatesCompaniesActivitySeries() {
    const now = new Date();
    const months = buildLastSixMonths(now);

    const activity = await Promise.all(
      months.map(async (monthStart) => {
        const monthEnd = endOfMonth(monthStart);

        const [candidates, companies] = await Promise.all([
          prisma.user.count({
            where: {
              role: { in: ["STUDENT", "PROFESSIONAL"] },
              createdAt: { gte: monthStart, lt: monthEnd },
            },
          }),
          prisma.user.count({
            where: {
              role: "EMPLOYER",
              createdAt: { gte: monthStart, lt: monthEnd },
              employerProfile: { verificationStatus: "APPROVED" },
            },
          }),
        ]);

        return { monthStart, candidates, companies };
      })
    );

    return activity;
  },

  async getRecentCandidates(limit = 3) {
    const users = await prisma.user.findMany({
      where: { role: { in: ["STUDENT", "PROFESSIONAL"] } },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return users;
  },

  async getCurrentAndPreviousMonthCounts() {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      appliedCurrent,
      appliedPrevious,
      hiredCurrent,
      hiredPrevious,
      scheduledCurrent,
      scheduledPrevious,
    ] = await Promise.all([
      prisma.user.count({
        where: {
          role: { in: ["STUDENT", "PROFESSIONAL"] },
          createdAt: { gte: currentMonthStart },
        },
      }),
      prisma.user.count({
        where: {
          role: { in: ["STUDENT", "PROFESSIONAL"] },
          createdAt: { gte: previousMonthStart, lt: currentMonthStart },
        },
      }),
      prisma.user.count({
        where: {
          role: "EMPLOYER",
          createdAt: { gte: currentMonthStart },
          employerProfile: { verificationStatus: "APPROVED" },
        },
      }),
      prisma.user.count({
        where: {
          role: "EMPLOYER",
          createdAt: { gte: previousMonthStart, lt: currentMonthStart },
          employerProfile: { verificationStatus: "APPROVED" },
        },
      }),
      prisma.employerProfile.count({
        where: {
          verificationStatus: "PENDING",
          createdAt: { gte: currentMonthStart },
        },
      }),
      prisma.employerProfile.count({
        where: {
          verificationStatus: "PENDING",
          createdAt: { gte: previousMonthStart, lt: currentMonthStart },
        },
      }),
    ]);

    return {
      applied: { current: appliedCurrent, previous: appliedPrevious },
      hired: { current: hiredCurrent, previous: hiredPrevious },
      scheduled: { current: scheduledCurrent, previous: scheduledPrevious },
    };
  },
};
