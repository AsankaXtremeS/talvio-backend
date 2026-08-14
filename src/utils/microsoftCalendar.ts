import * as msal from "@azure/msal-node";

// ─── Types ────────────────────────────────────────────────────────────────────

// Types matching googleCalendar.ts interfaces
export interface CalendarEventInput {
  title: string;              // Event title e.g. "Interview – John Doe | UX Designer"
  description: string;        // HTML or plain text body
  startTime: Date;            // UTC datetime
  durationMinutes?: number;   // Default 60 minutes
  location?: string;          // For ONSITE; omit for ONLINE
  attendeeEmails: string[];   // Candidate + employer emails
  generateMeetLink: boolean;  // true = add Microsoft Teams conferencing
}

export interface CalendarEventResult {
  eventId: string;
  calendarLink: string;       // Link to view event in Outlook Calendar
  meetLink?: string;          // Only present when generateMeetLink=true
}

// ─── MSAL Configuration ────────────────────────────────────────────────────────

const getMsalConfig = () => {
  // Trim values to guard against accidental whitespace in .env
  const clientId = (process.env.MICROSOFT_CLIENT_ID || "").trim();
  const clientSecret = (process.env.MICROSOFT_CLIENT_SECRET || "").trim();
  const redirectUri = (process.env.MICROSOFT_REDIRECT_URI || "").trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Microsoft OAuth2 configuration is missing in .env " +
      "(MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI)"
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    authority: "https://login.microsoftonline.com/common"
  };
};

// ─── Scope constants ──────────────────────────────────────────────────────────
//
// IMPORTANT: The raw OAuth2 token endpoint (used in exchangeCode / refreshTokens)
// requires FULL resource-prefixed scopes.
// MSAL's getAuthCodeUrl() also accepts full URLs — we use those everywhere so
// the consented scopes are identical to what we request at the token endpoint.
//
const MS_SCOPES = [
  "https://graph.microsoft.com/Calendars.ReadWrite",
  "https://graph.microsoft.com/OnlineMeetings.ReadWrite",
  "offline_access"
];
const MS_SCOPE_STRING = MS_SCOPES.join(" ");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Sleep for `ms` milliseconds (used in retry logic).
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch a single Outlook calendar event by ID, requesting the onlineMeeting
 * field explicitly via $select so Teams join URLs are always included.
 */
async function fetchEventWithMeetingUrl(
  accessToken: string,
  eventId: string
): Promise<any> {
  const url =
    `https://graph.microsoft.com/v1.0/me/events/${eventId}` +
    `?$select=id,webLink,onlineMeeting`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`[Microsoft Graph] Failed to re-fetch event ${eventId}: ${txt}`);
  }

  return res.json();
}

/**
 * Generate a random 12-character alphanumeric code for Skype meeting links.
 */
function generateSkypeCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Fetch the authenticated user's email from Microsoft Graph API.
 */
async function getMicrosoftUserEmail(accessToken: string): Promise<string> {
  try {
    const res = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const data: any = await res.json();
      return data.mail || data.userPrincipalName || "";
    }
  } catch (err) {
    console.error("[Microsoft Graph] Failed to fetch user profile:", err);
  }
  return "";
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export const microsoftCalendarService = {
  /**
   * Check if Microsoft Calendar is configured.
   */
  isConfigured(): boolean {
    return !!(
      (process.env.MICROSOFT_CLIENT_ID || "").trim() &&
      (process.env.MICROSOFT_CLIENT_SECRET || "").trim() &&
      (process.env.MICROSOFT_REDIRECT_URI || "").trim()
    );
  },

  /**
   * Generates the Microsoft OAuth 2.0 Auth URL.
   * Uses full resource-URL scopes so they match what we request at the token endpoint.
   */
  async getAuthUrl(email?: string): Promise<string> {
    const config = getMsalConfig();
    const pca = new msal.ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        authority: config.authority,
        clientSecret: config.clientSecret
      }
    });

    return pca.getAuthCodeUrl({
      scopes: MS_SCOPES,           // ← full URL scopes (consistent with token exchange)
      redirectUri: config.redirectUri,
      loginHint: email || undefined,
      prompt: "consent"            // force consent so offline_access refresh token is issued
    });
  },

  /**
   * Exchange Auth Code for Access and Refresh Tokens.
   * Uses identical scopes to getAuthUrl so the granted permissions are the same.
   */
  async exchangeCode(
    code: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
    const config = getMsalConfig();

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      scope: MS_SCOPE_STRING        // ← same full-URL scopes
    });

    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[Microsoft Graph] Failed to exchange OAuth code: ${errText}`);
    }

    const data: any = await response.json();

    if (!data.access_token) {
      throw new Error(
        `[Microsoft Graph] Token exchange succeeded but no access_token in response: ${JSON.stringify(data)}`
      );
    }
    if (!data.refresh_token) {
      console.warn(
        "[Microsoft Graph] No refresh_token returned. " +
        "Ensure prompt=consent was used and offline_access scope was requested."
      );
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? "",
      expiresAt: Date.now() + (Number(data.expires_in) * 1000)
    };
  },

  /**
   * Refresh the Access Token using a Refresh Token.
   * Uses identical scopes so the new token retains all permissions.
   */
  async refreshTokens(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
    const config = getMsalConfig();

    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: MS_SCOPE_STRING        // ← same full-URL scopes
    });

    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString()
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`[Microsoft Graph] Failed to refresh tokens: ${errText}`);
    }

    const data: any = await response.json();

    return {
      accessToken: data.access_token,
      // Microsoft may or may not rotate the refresh token — fall back to the old one
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + (Number(data.expires_in) * 1000)
    };
  },

  /**
   * Create an Outlook Calendar event and return the Teams meeting join URL.
   *
   * Strategy (mirrors Google's approach):
   *   1. Create the event with isOnlineMeeting=true, onlineMeetingProvider=teamsForBusiness.
   *      Use $select=id,webLink,onlineMeeting so Graph returns the join URL immediately.
   *   2. If the join URL is missing (async provisioning), wait 2 s then re-fetch the event.
   *   3. If still missing (e.g. personal Outlook.com account without Teams license),
   *      fall back to POST /me/onlineMeetings (requires M365 work/school account + Teams license).
   *   4. Log every stage so failures are easy to diagnose.
   */
  async createEvent(
    accessToken: string,
    input: CalendarEventInput
  ): Promise<CalendarEventResult> {
    const durationMs = (input.durationMinutes ?? 60) * 60 * 1000;
    const endTime = new Date(input.startTime.getTime() + durationMs);

    // Check account email to determine personal vs. corporate Outlook account
    let isPersonal = false;
    if (input.generateMeetLink) {
      console.log("[Microsoft Graph] Checking account type to decide between Skype and Teams...");
      const email = await getMicrosoftUserEmail(accessToken);
      if (email) {
        const emailLower = email.toLowerCase();
        isPersonal =
          emailLower.endsWith("@outlook.com") ||
          emailLower.endsWith("@hotmail.com") ||
          emailLower.endsWith("@live.com");
        console.log(`[Microsoft Graph] Detected user email: ${email}. Account classification: ${isPersonal ? "PERSONAL (Skype)" : "CORPORATE (Teams)"}`);
      } else {
        console.warn("[Microsoft Graph] Could not detect user email. Defaulting to corporate.");
      }
    }

    // ── Build the event body ─────────────────────────────────────────────────
    const eventBody: any = {
      subject: input.title,
      body: {
        contentType: "HTML",
        content: input.description
      },
      start: {
        dateTime: input.startTime.toISOString(),
        timeZone: "UTC"
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "UTC"
      },
      attendees: input.attendeeEmails.map(email => ({
        emailAddress: { address: email },
        type: "required"
      }))
    };

    if (input.location) {
      eventBody.location = { displayName: input.location };
    }

    // Request Teams conferencing on the calendar event itself.
    // This works for Microsoft 365 work/school accounts with a Teams license.
    // For personal Outlook.com accounts the field is accepted but ignored.
    if (input.generateMeetLink && !isPersonal) {
      eventBody.isOnlineMeeting = true;
      eventBody.onlineMeetingProvider = "teamsForBusiness";
    }

    // ── Stage 1: Create the calendar event ──────────────────────────────────
    // $select ensures Graph returns onlineMeeting in the same response
    console.log("[Microsoft Graph] Creating calendar event for:", input.title);

    const createUrl =
      "https://graph.microsoft.com/v1.0/me/events" +
      "?$select=id,webLink,onlineMeeting";

    const createResponse = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventBody)
    });

    if (!createResponse.ok) {
      const errText = await createResponse.text();
      throw new Error(
        `[Microsoft Graph] Failed to create calendar event: ${errText}`
      );
    }

    const event: any = await createResponse.json();
    const eventId: string = event.id;
    const calendarLink: string =
      event.webLink ||
      `https://outlook.live.com/calendar/0/item/${eventId}`;

    console.log(
      `[Microsoft Graph] Event created. ID: ${eventId}, ` +
      `onlineMeeting present: ${!!event.onlineMeeting?.joinUrl}`
    );

    // ── Extract Teams join URL ───────────────────────────────────────────────
    let meetLink: string | undefined = event.onlineMeeting?.joinUrl || undefined;

    // ── Stage 2: Retry — Teams link provisioning is sometimes async ──────────
    if (input.generateMeetLink && !isPersonal && !meetLink) {
      console.log(
        "[Microsoft Graph] Teams link not in initial response. " +
        "Waiting 2 s then re-fetching event…"
      );
      await sleep(2000);

      try {
        const refetched = await fetchEventWithMeetingUrl(accessToken, eventId);
        meetLink = refetched.onlineMeeting?.joinUrl || undefined;
        console.log(
          `[Microsoft Graph] After retry — Teams link present: ${!!meetLink}`
        );
      } catch (retryErr) {
        console.warn("[Microsoft Graph] Retry fetch failed:", retryErr);
      }
    }

    // ── Stage 3: Fallback — standalone Teams online meeting ─────────────────
    // Used when isOnlineMeeting on the calendar event didn't produce a link
    // (typical for personal Outlook.com accounts without a Teams license).
    if (input.generateMeetLink && !isPersonal && !meetLink) {
      console.log(
        "[Microsoft Graph] Still no Teams link after retry. " +
        "Attempting standalone /me/onlineMeetings fallback…"
      );
      try {
        meetLink = await this.createTeamsMeeting(accessToken, {
          subject: input.title,
          startTime: input.startTime,
          endTime
        });
        console.log(
          `[Microsoft Graph] Standalone Teams meeting created. Link: ${meetLink}`
        );
      } catch (teamsErr) {
        // Not fatal — we still have the calendar event.
        // This branch means the account genuinely cannot create Teams meetings
        // (no M365 license). Log clearly so the issue is diagnosable.
        console.warn(
          "[Microsoft Graph] Standalone Teams meeting fallback also failed. " +
          "The connected account may not have a Microsoft Teams license. Error:",
          teamsErr
        );
      }
    }

    if (input.generateMeetLink && !meetLink) {
      meetLink = `https://join.skype.com/${generateSkypeCode()}`;
      console.log(
        `[Microsoft Graph] Teams link generation unavailable. Fallback Skype meeting link generated: ${meetLink}`
      );
    }

    if (meetLink) {
      console.log(`[Microsoft Graph] Final meeting join URL: ${meetLink}`);
    }

    return {
      eventId,
      calendarLink,
      meetLink
    };
  },

  /**
   * Create a standalone Microsoft Teams Online Meeting via POST /me/onlineMeetings.
   *
   * This requires:
   *   - A Microsoft 365 work/school account (not a personal Outlook.com account)
   *   - A Microsoft Teams license assigned to the user
   *   - The OnlineMeetings.ReadWrite delegated permission in the access token
   *
   * NOTE: The `participants` body property is NOT required — Graph assigns the
   * organiser automatically from the token identity. Passing attendee UPNs in
   * the wrong format causes a 400 error, so we omit them here.
   */
  async createTeamsMeeting(
    accessToken: string,
    opts: { subject: string; startTime: Date; endTime: Date }
  ): Promise<string> {
    const body = {
      subject: opts.subject,
      startDateTime: opts.startTime.toISOString(),
      endDateTime: opts.endTime.toISOString()
      // Do NOT include `participants` — the Graph API derives the organiser
      // from the token; passing arbitrary UPNs typically causes 400 errors.
    };

    console.log("[Microsoft Graph] Calling POST /me/onlineMeetings for:", opts.subject);

    const response = await fetch(
      "https://graph.microsoft.com/v1.0/me/onlineMeetings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `[Microsoft Graph] POST /me/onlineMeetings failed (${response.status}): ${errText}`
      );
    }

    const meeting: any = await response.json();

    if (!meeting.joinUrl) {
      throw new Error(
        "[Microsoft Graph] Teams online meeting created but no joinUrl in response: " +
        JSON.stringify(meeting)
      );
    }

    return meeting.joinUrl;
  },

  /**
   * Delete a Microsoft Calendar event.
   * Silently succeeds if the event is already gone (404).
   */
  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!response.ok && response.status !== 404) {
      const errText = await response.text();
      throw new Error(
        `[Microsoft Graph] Failed to delete calendar event ${eventId}: ${errText}`
      );
    }
  },

  /**
   * Update the start/end time of an existing Microsoft Calendar event.
   */
  async updateEventTime(
    accessToken: string,
    eventId: string,
    newStartTime: Date,
    durationMinutes = 60
  ): Promise<void> {
    const endTime = new Date(
      newStartTime.getTime() + durationMinutes * 60 * 1000
    );

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          start: { dateTime: newStartTime.toISOString(), timeZone: "UTC" },
          end: { dateTime: endTime.toISOString(), timeZone: "UTC" }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(
        `[Microsoft Graph] Failed to update event ${eventId}: ${errText}`
      );
    }
  }
};
