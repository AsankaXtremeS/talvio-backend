import { ApplicationStatus } from "@prisma/client";
export declare const applicationsRepository: {
    findById(id: string): Promise<({
        jobPost: {
            employer: {
                companyName: string;
                companyLogoUrl: string | null;
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
    }) | null>;
    findByCandidateAndJob(candidateProfileId: string, jobPostId: string): Promise<{
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
    } | null>;
    findManyByCandidate(candidateProfileId: string, skip: number, take: number): Promise<({
        jobPost: {
            interviews: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                status: import(".prisma/client").$Enums.InterviewStatus;
                location: string | null;
                employerId: string;
                candidateProfileId: string;
                jobPostId: string;
                meetingType: import(".prisma/client").$Enums.InterviewMeetingType;
                scheduledAt: Date;
                meetingLink: string | null;
                additionalInfo: string | null;
                emailBody: string | null;
                rescheduledFromId: string | null;
                rescheduledToId: string | null;
                googleCalendarEventId: string | null;
                googleCalendarLink: string | null;
                candidateEmail: string;
                emailSentAt: Date | null;
                cancelledAt: Date | null;
                cancellationReason: string | null;
            }[];
            employer: {
                companyName: string;
                companyLogoUrl: string | null;
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
    countByCandidate(candidateProfileId: string): Promise<number>;
    create(data: {
        candidateProfileId: string;
        jobPostId: string;
        cvUrl: string;
        cvFileName?: string;
        coverLetter?: string;
    }): Promise<{
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
    }>;
    delete(id: string): Promise<{
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
    }>;
    updateStatus(id: string, status: ApplicationStatus): Promise<{
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
    }>;
};
//# sourceMappingURL=applications.repository.d.ts.map