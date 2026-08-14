import { Prisma } from "@prisma/client";
export interface GetAdminJobPostsOptions {
    search?: string;
    page?: number;
    limit?: number;
}
declare const adminJobPostSelect: {
    id: true;
    title: true;
    type: true;
    status: true;
    employmentType: true;
    closingDate: true;
    createdAt: true;
    description: true;
    _count: {
        select: {
            applications: true;
        };
    };
    employer: {
        select: {
            companyName: true;
            user: {
                select: {
                    email: true;
                };
            };
        };
    };
};
export type AdminJobPostRecord = Prisma.JobPostGetPayload<{
    select: typeof adminJobPostSelect;
}>;
export declare const jobpostRepository: {
    getStats(): Promise<{
        internshipPosts: number;
        internshipCompanies: number;
        jobPosts: number;
        jobCompanies: number;
    }>;
    findAll(options?: GetAdminJobPostsOptions): Promise<{
        posts: {
            id: string;
            createdAt: Date;
            _count: {
                applications: number;
            };
            status: import(".prisma/client").$Enums.PostStatus;
            title: string;
            type: import(".prisma/client").$Enums.JobType;
            description: string | null;
            employmentType: import(".prisma/client").$Enums.EmploymentType | null;
            closingDate: Date | null;
            employer: {
                user: {
                    email: string;
                };
                companyName: string;
            };
        }[];
        total: number;
    }>;
    findById(id: string): Promise<{
        id: string;
        createdAt: Date;
        _count: {
            applications: number;
        };
        status: import(".prisma/client").$Enums.PostStatus;
        title: string;
        type: import(".prisma/client").$Enums.JobType;
        description: string | null;
        employmentType: import(".prisma/client").$Enums.EmploymentType | null;
        closingDate: Date | null;
        employer: {
            user: {
                email: string;
            };
            companyName: string;
        };
    } | null>;
    deleteById(id: string): Promise<{
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
    }>;
    existsById(id: string): Promise<boolean>;
};
export {};
//# sourceMappingURL=jobpost.repository.d.ts.map