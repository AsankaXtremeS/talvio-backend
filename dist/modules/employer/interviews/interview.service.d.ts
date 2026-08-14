import { CreateInterviewInput, UpdateInterviewInput, GenerateEmailInput } from "./interview.validation";
import { InterviewDTO } from "./interview.types";
export declare const interviewService: {
    /**
     * Fetch candidate profile details for schedule UI.
     */
    getCandidateProfile(employerId: string, candidateProfileId: string): Promise<{
        id: string;
        name: string;
        email: string;
        headline: string;
        skills: string[];
    }>;
    /**
     * Create a draft interview.
     * For ONLINE meetings, creates a Google Calendar event with Meet link.
     * For ONSITE, creates a calendar event with location.
     * Does NOT send email yet — that happens in scheduleAndSend.
     */
    createDraft(employerId: string, input: CreateInterviewInput): Promise<InterviewDTO>;
    /**
     * Get a single interview by ID.
     * SECURITY: scoped to authenticated employerId.
     */
    getById(id: string, employerId: string): Promise<InterviewDTO>;
    /**
     * List all interviews for this employer.
     */
    list(employerId: string, options: {
        status?: string;
        date?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: InterviewDTO[];
        pagination: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    /**
     * Get all dates in a month that have scheduled interviews.
     * Used to show dots on the calendar.
     */
    getScheduledDates(employerId: string, year: number, month: number): Promise<string[]>;
    /**
     * Update draft interview data (date, time, type, etc.).
     * Regenerates Google Calendar event if time changed.
     */
    updateDraft(id: string, employerId: string, input: UpdateInterviewInput): Promise<InterviewDTO>;
    /**
     * Generate an email preview (subject + HTML body) based on current form data.
     * Does NOT save anything — purely for frontend display.
     */
    generateEmailPreview(employerId: string, input: GenerateEmailInput): Promise<{
        subject: string;
        body: string;
    }>;
    /**
     * Confirm and send the interview invitation email.
     * Changes status from DRAFT → SCHEDULED.
     * Records the time the email was sent.
     */
    scheduleAndSend(id: string, employerId: string): Promise<InterviewDTO>;
    /**
     * Cancel an interview (DRAFT or SCHEDULED).
     * Removes the Google Calendar event if one exists.
     */
    cancel(id: string, employerId: string): Promise<void>;
    /**
     * Save the custom email body for a draft interview.
     * Called when the employer edits the email in the preview panel.
     */
    saveEmailBody(id: string, employerId: string, emailBody: string): Promise<InterviewDTO>;
    /**
     * Generate a cancellation email preview.
     * Returns subject and body for the cancellation email.
     */
    generateCancelEmailPreview(id: string, employerId: string, reason: string): Promise<{
        subject: string;
        body: string;
    }>;
    /**
     * Cancel an interview and send cancellation email to the candidate.
     * Changes status SCHEDULED → CANCELLED.
     * Removes Google Calendar event.
     * Sends email with cancellation reason.
     */
    cancelAndSendEmail(id: string, employerId: string, reason: string, emailBody: string): Promise<InterviewDTO>;
};
//# sourceMappingURL=interview.service.d.ts.map