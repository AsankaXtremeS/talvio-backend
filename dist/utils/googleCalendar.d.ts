export interface CalendarEventInput {
    title: string;
    description: string;
    startTime: Date;
    durationMinutes?: number;
    location?: string;
    attendeeEmails: string[];
    generateMeetLink: boolean;
}
export interface CalendarEventResult {
    eventId: string;
    calendarLink: string;
    meetLink?: string;
}
/**
 * Creates an OAuth2 client for a specific employer using their stored tokens.
 * This client can be used to make authorized calls to Google APIs.
 */
export declare function getEmployerGoogleClient(tokens: {
    accessToken: string;
    refreshToken: string;
    expiryDate?: number;
}): import("google-auth-library").OAuth2Client;
export declare const googleCalendarService: {
    /**
     * Create a Google Calendar event.
     * If generateMeetLink is true, Google Meet conferencing is automatically added.
     * Returns the event ID, calendar link, and optionally the Meet link.
     *
     * @throws Error if Google credentials are missing or API call fails.
     */
    createEvent(auth: any, input: CalendarEventInput): Promise<CalendarEventResult>;
    /**
     * Delete a calendar event (used when interview is cancelled).
     * Silently succeeds if the event no longer exists.
     */
    deleteEvent(auth: any, eventId: string): Promise<void>;
    /**
     * Update an existing calendar event (used when interview is rescheduled).
     */
    updateEventTime(auth: any, eventId: string, newStartTime: Date, durationMinutes?: number): Promise<void>;
    /**
     * Check if Google Calendar is configured.
     * Use this to gracefully degrade if credentials aren't set up yet.
     */
    isConfigured(): boolean;
};
//# sourceMappingURL=googleCalendar.d.ts.map