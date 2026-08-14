import { CreateJobPostInput, UpdateJobPostInput } from "./jobPosts.validation";
export interface GetJobPostsOptions {
    employerId: string;
    status?: string;
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export declare const jobsRepository: {
    findEmployerProfileByUserId(userId: string): Promise<{
        id: string;
        verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
    } | null>;
    findAll(options: GetJobPostsOptions): Promise<{
        posts: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            _count: {
                applications: number;
            };
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
            location: string | null;
            closingDate: Date | null;
            employer: {
                id: string;
                companyName: string;
                companyLogoUrl: string | null;
            };
        }[];
        total: number;
    }>;
    getStats(employerId: string): Promise<{
        DRAFT: number;
        ACTIVE: number;
        CLOSED: number;
        TOTAL: number;
        APPLICATIONS: number;
    }>;
    findById(id: string, employerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        _count: {
            applications: number;
        };
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
        location: string | null;
        closingDate: Date | null;
        employer: {
            id: string;
            companyName: string;
            companyLogoUrl: string | null;
        };
    } | null>;
    create(employerId: string, data: CreateJobPostInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        _count: {
            applications: number;
        };
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
        location: string | null;
        closingDate: Date | null;
        employer: {
            id: string;
            companyName: string;
        };
    }>;
    update(id: string, employerId: string, data: UpdateJobPostInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        _count: {
            applications: number;
        };
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
        location: string | null;
        closingDate: Date | null;
        employer: {
            id: string;
            companyName: string;
        };
    }>;
    deleteById(id: string, employerId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    findApplicationsByJobPost(jobPostId: string, employerId: string, status?: string): Promise<({
        candidateProfile: {
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
            id: string;
            skills: string[];
            headline: string | null;
        };
    } & {
        id: string;
        updatedAt: Date;
        candidateProfileId: string;
        jobPostId: string;
        cvUrl: string;
        cvFileName: string | null;
        coverLetter: string | null;
        aiScore: number | null;
        aiSuggestions: string[];
        applicationStatus: import(".prisma/client").$Enums.ApplicationStatus;
        appliedAt: Date;
    })[]>;
};
//# sourceMappingURL=jobPosts.repository.d.ts.map