export declare class ApplicationsService {
    getCandidateApplications(userId: string, page: number, limit: number): Promise<{
        applications: ({
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
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    applyToJob(userId: string, jobPostId: string, data: {
        cvUrl?: string;
        cvFileName?: string;
        coverLetter?: string;
        useDefaultCv?: boolean;
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
    withdrawApplication(userId: string, applicationId: string): Promise<{
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
    getCandidateApplicationWithHistory(userId: string, applicationId: string): Promise<{
        jobPost: {
            employer: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                companyName: string;
                registrationFileUrl: string;
                registrationFileName: string;
                verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
                rejectionReason: string | null;
                companyDescription: string | null;
                companyLogoUrl: string | null;
                companyWebsite: string | null;
                companyLocation: string | null;
                coverImageUrl: string | null;
                industry: string | null;
                companyType: string | null;
                companySize: string | null;
                foundedYear: number | null;
                specialties: string | null;
                linkedInUrl: string | null;
                facebookUrl: string | null;
                twitterUrl: string | null;
                googleAccessToken: string | null;
                googleRefreshToken: string | null;
                googleTokenExpiry: bigint | null;
                googleCalendarConnected: boolean;
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
        statusHistory: {
            id: string;
            status: import(".prisma/client").$Enums.ApplicationStatus;
            changedAt: Date;
            applicationId: string;
            note: string | null;
        }[];
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
    }>;
    getCandidateStats(userId: string): Promise<{
        applicationsSent: number;
        interviewsScheduled: any;
        pendingMatches: number;
        totalAvailable: number;
        profileViews: number;
    }>;
    getApplicationById(applicationId: string): Promise<({
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
}
export declare const applicationsService: ApplicationsService;
//# sourceMappingURL=applications.service.d.ts.map