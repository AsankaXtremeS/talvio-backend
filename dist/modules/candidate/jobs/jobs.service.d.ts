export declare const jobsService: {
    getNewJobsByRole: (role: string) => Promise<{
        count: number;
        jobs: {
            id: string;
            title: string;
            company: string;
            companyLogoUrl: string | null;
            location: string;
            createdAt: Date;
            type: import(".prisma/client").$Enums.JobType;
            workMode: import(".prisma/client").$Enums.WorkMode | null;
        }[];
    }>;
    getJobsByRole: (role: string, page?: number, limit?: number) => Promise<{
        jobs: {
            id: string;
            title: string;
            type: import(".prisma/client").$Enums.JobType;
            description: string | null;
            requirements: string[];
            responsibilities: string[];
            skillsRequired: string[];
            workMode: import(".prisma/client").$Enums.WorkMode | null;
            employmentType: import(".prisma/client").$Enums.EmploymentType | null;
            stipendType: import(".prisma/client").$Enums.StipendType | null;
            location: string | null;
            duration: string | null;
            experienceLevel: import(".prisma/client").$Enums.ExperienceLevel | null;
            closingDate: Date | null;
            createdAt: Date;
            company: string;
            companyLogoUrl: string | null;
            companyLocation: string | null;
            companyDescription: string | null;
            companyWebsite: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
};
//# sourceMappingURL=jobs.service.d.ts.map