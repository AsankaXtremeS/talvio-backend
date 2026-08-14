import { InterviewMeetingType, InterviewStatus } from "@prisma/client";
import { CreateInterviewInput } from "./interview.validation";
export declare const interviewRepository: {
    /**
     * Create a new interview record (initially as DRAFT).
     * Returns the full interview with relations.
     */
    create(employerId: string, data: CreateInterviewInput, scheduledAt: Date, candidateEmail: string, options?: {
        meetingLink?: string;
        googleCalendarEventId?: string;
        googleCalendarLink?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        jobPost: {
            id: string;
            title: string;
            type: import(".prisma/client").$Enums.JobType;
            location: string | null;
            employer: {
                companyName: string;
            };
        };
        status: import(".prisma/client").$Enums.InterviewStatus;
        location: string | null;
        employer: {
            user: {
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
            id: string;
            companyName: string;
            companyLocation: string | null;
        };
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
        candidate: {
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
    }>;
    /**
     * Find a single interview by ID.
     * SECURITY: always pass employerId to prevent cross-employer data access.
     */
    findById(id: string, employerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        jobPost: {
            id: string;
            title: string;
            type: import(".prisma/client").$Enums.JobType;
            location: string | null;
            employer: {
                companyName: string;
            };
        };
        status: import(".prisma/client").$Enums.InterviewStatus;
        location: string | null;
        employer: {
            user: {
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
            id: string;
            companyName: string;
            companyLocation: string | null;
        };
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
        candidate: {
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
    } | null>;
    /**
     * List all interviews for an employer.
     * Optionally filter by status, paginate.
     */
    findAll(employerId: string, options?: {
        status?: string;
        date?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        total: number;
        interviews: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            jobPost: {
                id: string;
                title: string;
                type: import(".prisma/client").$Enums.JobType;
                location: string | null;
                employer: {
                    companyName: string;
                };
            };
            status: import(".prisma/client").$Enums.InterviewStatus;
            location: string | null;
            employer: {
                user: {
                    email: string;
                    firstName: string | null;
                    lastName: string | null;
                };
                id: string;
                companyName: string;
                companyLocation: string | null;
            };
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
            candidate: {
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
        }[];
    }>;
    /**
     * Find all scheduled interviews for a specific date (for calendar display).
     * Returns only interviews with status=SCHEDULED.
     */
    findByDate(employerId: string, date: Date): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        jobPost: {
            id: string;
            title: string;
            type: import(".prisma/client").$Enums.JobType;
            location: string | null;
            employer: {
                companyName: string;
            };
        };
        status: import(".prisma/client").$Enums.InterviewStatus;
        location: string | null;
        employer: {
            user: {
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
            id: string;
            companyName: string;
            companyLocation: string | null;
        };
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
        candidate: {
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
    }[]>;
    /**
     * Get all distinct dates that have scheduled interviews for calendar dots.
     * Returns array of ISO date strings e.g. ["2026-04-15", "2026-04-22"]
     */
    getScheduledDates(employerId: string, year: number, month: number): Promise<string[]>;
    /**
     * Update an interview.
     * SECURITY: always scoped to employerId to prevent unauthorized updates.
     */
    update(id: string, employerId: string, data: Partial<{
        scheduledAt: Date;
        meetingType: InterviewMeetingType;
        status: InterviewStatus;
        location: string | null;
        meetingLink: string | null;
        additionalInfo: string | null;
        emailBody: string | null;
        googleCalendarEventId: string | null;
        googleCalendarLink: string | null;
        emailSentAt: Date | null;
        rescheduledFromId: string | null;
        rescheduledToId: string | null;
        cancelledAt: Date | null;
        cancellationReason: string | null;
    }>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        jobPost: {
            id: string;
            title: string;
            type: import(".prisma/client").$Enums.JobType;
            location: string | null;
            employer: {
                companyName: string;
            };
        };
        status: import(".prisma/client").$Enums.InterviewStatus;
        location: string | null;
        employer: {
            user: {
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
            id: string;
            companyName: string;
            companyLocation: string | null;
        };
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
        candidate: {
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
    }>;
    /**
     * Hard delete an interview.
     * SECURITY: scoped to employerId.
     */
    delete(id: string, employerId: string): Promise<{
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
    }>;
    /**
     * Check that the candidate's profile belongs to the given application for this job post.
     * Used before scheduling to ensure the candidate actually applied.
     */
    findApplication(candidateProfileId: string, jobPostId: string): Promise<{
        id: string;
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
        applicationStatus: import(".prisma/client").$Enums.ApplicationStatus;
    } | null>;
    /**
     * Fetch job post with employer info — needed for email generation.
     * SECURITY: scoped to employerId to prevent leaking other employers' posts.
     */
    findJobPostForEmployer(jobPostId: string, employerId: string): Promise<{
        id: string;
        title: string;
        type: import(".prisma/client").$Enums.JobType;
        location: string | null;
        employer: {
            user: {
                email: string;
                firstName: string | null;
                lastName: string | null;
            };
            companyName: string;
            companyLocation: string | null;
        };
    } | null>;
    /**
     * Fetch minimal candidate info for email generation.
     */
    findCandidateProfile(candidateProfileId: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
        };
        id: string;
        skills: string[];
        headline: string | null;
    } | null>;
};
//# sourceMappingURL=interview.repository.d.ts.map