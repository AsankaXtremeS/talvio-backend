"use strict";
// Google Calendar API utility.
// Creates calendar events with optional Google Meet link generation.
// Uses OAuth2 for server-side auth — acts on behalf of the employer.
//
// SETUP REQUIRED (in .env):
//   GOOGLE_CLIENT_ID=...
//   GOOGLE_CLIENT_SECRET=...
//   GOOGLE_REDIRECT_URI=...
//   GOOGLE_REFRESH_TOKEN=...
//   GOOGLE_CALENDAR_ID=primary  (or the specific calendar ID)
//
// NOTE: Using OAuth2 with a Refresh Token allows generating real Google Meet links
// without the Domain-Wide Delegation required by Service Accounts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleCalendarService = void 0;
exports.getEmployerGoogleClient = getEmployerGoogleClient;
const googleapis_1 = require("googleapis");
// ─── Auth & Client Helpers ───────────────────────────────────────────────────
/**
 * Creates an OAuth2 client for a specific employer using their stored tokens.
 * This client can be used to make authorized calls to Google APIs.
 */
function getEmployerGoogleClient(tokens) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    if (!clientId || !clientSecret) {
        throw new Error("Google OAuth2 Client ID or Secret missing in .env");
    }
    const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth2Client.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expiry_date: tokens.expiryDate,
    });
    return oauth2Client;
}
/**
 * Internal helper to build the auth client for the service's methods.
 * Note: Now expects the auth object to be passed in.
 */
function getCalendarClient(auth) {
    return googleapis_1.google.calendar({ version: "v3", auth });
}
// ─── Main Export ──────────────────────────────────────────────────────────────
exports.googleCalendarService = {
    /**
     * Create a Google Calendar event.
     * If generateMeetLink is true, Google Meet conferencing is automatically added.
     * Returns the event ID, calendar link, and optionally the Meet link.
     *
     * @throws Error if Google credentials are missing or API call fails.
     */
    async createEvent(auth, input) {
        const calendar = getCalendarClient(auth);
        const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
        // Calculate end time from duration (default 60 minutes)
        const durationMs = (input.durationMinutes ?? 60) * 60 * 1000;
        const endTime = new Date(input.startTime.getTime() + durationMs);
        // Build the event body
        const eventBody = {
            summary: input.title,
            description: input.description,
            start: {
                dateTime: input.startTime.toISOString(),
                timeZone: "UTC",
            },
            end: {
                dateTime: endTime.toISOString(),
                timeZone: "UTC",
            },
            attendees: input.attendeeEmails.map((email) => ({ email })),
            guestsCanModifyEvent: false,
            guestsCanInviteOthers: false,
            guestsCanSeeOtherGuests: false,
        };
        // Add location for ONSITE meetings
        if (input.location) {
            eventBody.location = input.location;
        }
        // Add Google Meet conferencing for ONLINE meetings
        if (input.generateMeetLink) {
            eventBody.conferenceData = {
                createRequest: {
                    requestId: Math.random().toString(36).substring(2) + Date.now().toString(36),
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                },
            };
        }
        const response = await calendar.events.insert({
            calendarId,
            // conferenceDataVersion=1 is required to trigger Meet link creation
            conferenceDataVersion: input.generateMeetLink ? 1 : 0,
            sendUpdates: "all",
            requestBody: eventBody,
        });
        let event = response.data;
        if (!event.id) {
            throw new Error("Google Calendar did not return an event ID");
        }
        // RETRY LOGIC: Sometimes Meet links take a moment to generate
        if (input.generateMeetLink && !event.conferenceData?.entryPoints) {
            console.log("[Google Calendar] Meet link not ready, retrying in 1.5s...");
            await new Promise(resolve => setTimeout(resolve, 1500));
            const refetched = await calendar.events.get({
                calendarId,
                eventId: event.id,
            });
            event = refetched.data;
        }
        // Extract Meet link from conference data
        const meetLink = event.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ??
            undefined;
        // Build the direct link to view the event in Google Calendar
        const calendarLink = event.htmlLink ??
            `https://calendar.google.com/calendar/event?eid=${Buffer.from(event.id).toString("base64")}`;
        return {
            eventId: event.id,
            calendarLink,
            meetLink,
        };
    },
    /**
     * Delete a calendar event (used when interview is cancelled).
     * Silently succeeds if the event no longer exists.
     */
    async deleteEvent(auth, eventId) {
        try {
            const calendar = getCalendarClient(auth);
            const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
            await calendar.events.delete({
                calendarId,
                eventId,
                sendUpdates: "all", // Notify attendees of cancellation
            });
        }
        catch (err) {
            // 404 = event already gone — not an error from our perspective
            if (err?.code !== 404 && err?.status !== 404) {
                throw err;
            }
        }
    },
    /**
     * Update an existing calendar event (used when interview is rescheduled).
     */
    async updateEventTime(auth, eventId, newStartTime, durationMinutes = 60) {
        const calendar = getCalendarClient(auth);
        const calendarId = process.env.GOOGLE_CALENDAR_ID || "primary";
        const endTime = new Date(newStartTime.getTime() + durationMinutes * 60 * 1000);
        await calendar.events.patch({
            calendarId,
            eventId,
            sendUpdates: "all",
            requestBody: {
                start: { dateTime: newStartTime.toISOString(), timeZone: "UTC" },
                end: { dateTime: endTime.toISOString(), timeZone: "UTC" },
            },
        });
    },
    /**
     * Check if Google Calendar is configured.
     * Use this to gracefully degrade if credentials aren't set up yet.
     */
    isConfigured() {
        return !!(process.env.GOOGLE_CLIENT_ID &&
            process.env.GOOGLE_CLIENT_SECRET);
    },
};
//# sourceMappingURL=googleCalendar.js.map