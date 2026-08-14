export declare const dashboardRepository: {
    getUserRoleCounts(): Promise<{
        undergraduates: number;
        professionals: number;
        totalUsers: number;
    }>;
    getCompanyCounts(): Promise<{
        totalCompanies: number;
        pendingApprovals: number;
    }>;
    getUserGrowthSeries(): Promise<{
        monthStart: Date;
        totalUsers: number;
    }[]>;
    getCandidatesCompaniesActivitySeries(): Promise<{
        monthStart: Date;
        candidates: number;
        companies: number;
    }[]>;
    getRecentCandidates(limit?: number): Promise<{
        id: string;
        role: import(".prisma/client").$Enums.Role;
        firstName: string | null;
        lastName: string | null;
    }[]>;
    getCurrentAndPreviousMonthCounts(): Promise<{
        applied: {
            current: number;
            previous: number;
        };
        hired: {
            current: number;
            previous: number;
        };
        scheduled: {
            current: number;
            previous: number;
        };
    }>;
};
//# sourceMappingURL=dashboard.repository.d.ts.map