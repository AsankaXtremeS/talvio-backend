export interface InterviewEmailData {
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    companyName: string;
    senderName: string;
    senderEmail: string;
    scheduledAt: Date;
    meetingType: "ONLINE" | "ONSITE" | "PHONE";
    location?: string | null;
    meetingLink?: string | null;
    additionalInfo?: string | null;
    isReschedule?: boolean;
    isCancellation?: boolean;
    cancellationReason?: string;
    customBody?: string | null;
}
/**
 * Build the HTML email body for an interview invitation.
 * Returns the full HTML string — ready to be embedded in sendMail.
 */
export declare function buildInterviewEmailHtml(data: InterviewEmailData): string;
/**
 * Build the email subject line.
 */
export declare function buildInterviewEmailSubject(data: InterviewEmailData): string;
/**
 * Send the interview invitation email to the candidate.
 */
export declare function sendInterviewEmail(data: InterviewEmailData): Promise<void>;
//# sourceMappingURL=interviewEmail.d.ts.map