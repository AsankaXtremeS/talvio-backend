import { JobType } from "@prisma/client";
export declare const jobsRepository: {
    findNewJobsByType: (type: JobType) => Promise<({
        employer: {
            companyName: string;
            companyLogoUrl: string | null;
            companyLocation: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PostStatus;
        title: string;
        type: import(".prisma/client").$Enums.JobType;
        description: string | null;
        requirements: string[];
        responsibilities: string[];
        skillsRequired: string[];
        additionalInformation: string | null;
        workMode: import(".prisma/client").$Enums.WorkMode | null;
        employmentType: import(".prisma/client").$Enums.EmploymentType | null;
        stipendType: import(".prisma/client").$Enums.StipendType | null;
        location: string | null;
        duration: string | null;
        experienceLevel: import(".prisma/client").$Enums.ExperienceLevel | null;
        closingDate: Date | null;
        employerId: string;
    })[]>;
    findActiveJobsByType: (type: JobType, page: number, limit: number) => Promise<{
        jobs: ({
            employer: {
                companyName: string;
                companyDescription: string | null;
                companyLogoUrl: string | null;
                companyWebsite: string | null;
                companyLocation: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PostStatus;
            title: string;
            type: import(".prisma/client").$Enums.JobType;
            description: string | null;
            requirements: string[];
            responsibilities: string[];
            skillsRequired: string[];
            additionalInformation: string | null;
            workMode: import(".prisma/client").$Enums.WorkMode | null;
            employmentType: import(".prisma/client").$Enums.EmploymentType | null;
            stipendType: import(".prisma/client").$Enums.StipendType | null;
            location: string | null;
            duration: string | null;
            experienceLevel: import(".prisma/client").$Enums.ExperienceLevel | null;
            closingDate: Date | null;
            employerId: string;
        })[];
        total: number;
    }>;
};
//# sourceMappingURL=jobs.repository.d.ts.map