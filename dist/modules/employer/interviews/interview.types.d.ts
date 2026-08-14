export type MeetingType = "ONLINE" | "ONSITE" | "PHONE";
export type InterviewStatus = "DRAFT" | "SCHEDULED" | "CANCELLED" | "COMPLETED";
/** Data required to create or update an interview */
export interface CreateInterviewInput {
    jobPostId: string;
    candidateProfileId: string;
    scheduledAt: string;
    meetingType: MeetingType;
    location?: string;
    additionalInfo?: string;
    emailBody?: string;
    isReschedule?: boolean;
    rescheduledFromId?: string;
}
export interface UpdateInterviewInput {
    scheduledAt?: string;
    meetingType?: MeetingType;
    location?: string;
    additionalInfo?: string;
    emailBody?: string;
    status?: InterviewStatus;
    isReschedule?: boolean;
    rescheduledFromId?: string | null;
    rescheduledToId?: string | null;
}
/** Shape returned to the frontend for an interview */
export interface InterviewDTO {
    id: string;
    status: InterviewStatus;
    scheduledAt: string;
    meetingType: MeetingType;
    location?: string | null;
    meetingLink?: string | null;
    googleCalendarLink?: string | null;
    additionalInfo?: string | null;
    emailBody?: string | null;
    emailSentAt?: string | null;
    candidateEmail: string;
    isReschedule?: boolean;
    rescheduledFromId?: string | null;
    rescheduledToId?: string | null;
    candidate: {
        id: string;
        name: string;
        email: string;
        headline?: string | null;
        skills: string[];
    };
    jobPost: {
        id: string;
        title: string;
        type: string;
        companyName: string;
    };
    employer: {
        companyName: string;
        email: string;
    };
    createdAt: string;
    updatedAt: string;
}
/** Summary shape for the interviews list page */
export interface InterviewSummaryDTO {
    id: string;
    status: InterviewStatus;
    scheduledAt: string;
    meetingType: MeetingType;
    location?: string | null;
    meetingLink?: string | null;
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    companyName: string;
}
/** Response for generating an email preview */
export interface EmailPreviewDTO {
    subject: string;
    body: string;
}
//# sourceMappingURL=interview.types.d.ts.map