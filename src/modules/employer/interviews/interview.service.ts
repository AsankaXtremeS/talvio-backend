import { prisma } from "../../../config/db";
import { interviewRepository } from "./interview.repository";
import { CreateInterviewInput, UpdateInterviewInput, GenerateEmailInput } from "./interview.validation";
import { googleCalendarService, getEmployerGoogleClient } from "../../../utils/googleCalendar";
import { microsoftCalendarService } from "../../../utils/microsoftCalendar";
import {
  buildInterviewEmailHtml,
  buildInterviewEmailSubject,
  sendInterviewEmail,
  InterviewEmailData,
} from "../../../utils/interviewEmail";
import { InterviewDTO } from "./interview.types";

// ─── Error helpers ────────────────────────────────────────────────────────────

interface ServiceError extends Error {
  statusCode?: number;
}

const buildHttpError = (message: string, statusCode: number): ServiceError => {
  const err: ServiceError = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// ─── DTO mapper

/**
 * Map a raw Prisma interview record to the clean DTO sent to the frontend.
 * SECURITY: This is the single place where we control what data leaves the API.
 */
function mapToDTO(raw: any): InterviewDTO {
  const candidateName = [
    raw.candidate?.user?.firstName,
    raw.candidate?.user?.lastName,
  ]
    .filter(Boolean)
    .join(" ") || "Candidate";

  const employerName = [
    raw.employer?.user?.firstName,
    raw.employer?.user?.lastName,
  ]
    .filter(Boolean)
    .join(" ") || raw.employer?.companyName || "Employer";

  return {
    id: raw.id,
    status: raw.status,
    scheduledAt: raw.scheduledAt.toISOString(),
    meetingType: raw.meetingType,
    location: raw.location ?? null,
    meetingLink: raw.meetingLink ?? null,
    googleCalendarLink: raw.googleCalendarLink ?? raw.microsoftCalendarLink ?? null,
    additionalInfo: raw.additionalInfo ?? null,
    emailBody: raw.emailBody ?? null,
    emailSentAt: raw.emailSentAt ? raw.emailSentAt.toISOString() : null,
    candidateEmail: raw.candidateEmail,
    rescheduledFromId: raw.rescheduledFromId ?? null,
    rescheduledToId: raw.rescheduledToId ?? null,
    candidate: {
      id: raw.candidate?.id ?? "",
      name: candidateName,
      email: raw.candidate?.user?.email ?? raw.candidateEmail,
      headline: raw.candidate?.headline ?? null,
      skills: raw.candidate?.skills ?? [],
    },
    jobPost: {
      id: raw.jobPost?.id ?? "",
      title: raw.jobPost?.title ?? "",
      type: raw.jobPost?.type === "JOB" ? "Job" : "Internship",
      companyName: raw.employer?.companyName ?? "",
    },
    employer: {
      companyName: raw.employer?.companyName ?? "",
      email: raw.employer?.user?.email ?? "",
    },
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
}

// ───  to build email data from raw record

function buildEmailData(raw: any, customBody?: string | null): InterviewEmailData {
  const candidateName = [
    raw.candidate?.user?.firstName,
    raw.candidate?.user?.lastName,
  ]
    .filter(Boolean)
    .join(" ") || "Candidate";

  const senderName = [
    raw.employer?.user?.firstName,
    raw.employer?.user?.lastName,
  ]
    .filter(Boolean)
    .join(" ") || raw.employer?.companyName || "Hiring Team";

  // Check if this is a reschedule by looking at rescheduledFromId or isReschedule flag
  const isReschedule = !!(raw.rescheduledFromId || raw.isReschedule);

  return {
    candidateName,
    candidateEmail: raw.candidateEmail ?? raw.candidate?.user?.email ?? "",
    jobTitle: raw.jobPost?.title ?? "",
    companyName: raw.employer?.companyName ?? "",
    senderName,
    senderEmail: raw.employer?.user?.email ?? "",
    scheduledAt: raw.scheduledAt,
    meetingType: raw.meetingType,
    location: raw.location,
    meetingLink: raw.meetingLink,
    additionalInfo: raw.additionalInfo,
    isReschedule,
    customBody: customBody ?? raw.emailBody ?? null,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

// to convert User ID to Employer Profile ID
async function getEmployerProfileId(userId: string): Promise<string> {
  const employerProfile = await prisma.employerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!employerProfile) {
    throw buildHttpError("Employer profile not found", 404);
  }
  return employerProfile.id;
}

/**
 *  to get a Google Auth client for a specific employer.
 * Returns null if the employer hasn't connected their calendar.
 */
async function getEmployerGoogleAuth(employerProfileId: string) {
  const employer = await prisma.employerProfile.findUnique({
    where: { id: employerProfileId },
    select: { 
      googleAccessToken: true, 
      googleRefreshToken: true, 
      googleTokenExpiry: true,
      googleCalendarConnected: true
    }
  });

  if (!employer || !employer.googleCalendarConnected || !employer.googleAccessToken || !employer.googleRefreshToken) {
    return null;
  }

  const tokens = {
    accessToken: employer.googleAccessToken,
    refreshToken: employer.googleRefreshToken,
    expiryDate: employer.googleTokenExpiry ? Number(employer.googleTokenExpiry) : undefined,
  };

  const auth = getEmployerGoogleClient(tokens);

  // Auto-update tokens in DB if they are refreshed by the library
  auth.on("tokens", async (newTokens) => {
    try {
      const updateData: any = {};
      if (newTokens.access_token) updateData.googleAccessToken = newTokens.access_token;
      if (newTokens.refresh_token) updateData.googleRefreshToken = newTokens.refresh_token;
      if (newTokens.expiry_date) updateData.googleTokenExpiry = BigInt(newTokens.expiry_date);

      if (Object.keys(updateData).length > 0) {
        await prisma.employerProfile.update({
          where: { id: employerProfileId },
          data: updateData
        });
        console.log(`[Google Tokens Refreshed] Employer: ${employerProfileId}`);
      }
    } catch (err) {
      console.error("Failed to update refreshed Google tokens in DB:", err);
    }
  });

  return auth;
}

/**
 * Get a Microsoft Access Token for a specific employer.
 * Automatically refreshes the token if expired or close to expiration.
 * Returns null if the employer hasn't connected Microsoft Calendar.
 */
async function getEmployerMicrosoftAuth(employerProfileId: string): Promise<string | null> {
  const employer = await prisma.employerProfile.findUnique({
    where: { id: employerProfileId },
    select: { 
      microsoftAccessToken: true, 
      microsoftRefreshToken: true, 
      microsoftTokenExpiry: true,
      microsoftCalendarConnected: true
    }
  });

  if (!employer || !employer.microsoftCalendarConnected || !employer.microsoftAccessToken || !employer.microsoftRefreshToken) {
    return null;
  }

  // Check if token is expired or expiring in less than 5 minutes (300000ms)
  const isExpired = employer.microsoftTokenExpiry 
    ? (Number(employer.microsoftTokenExpiry) - Date.now()) < 300000 
    : true;

  if (isExpired) {
    try {
      console.log(`[Microsoft Tokens Expired/Expiring] Refreshing tokens for Employer: ${employerProfileId}`);
      const refreshed = await microsoftCalendarService.refreshTokens(employer.microsoftRefreshToken);
      
      await prisma.employerProfile.update({
        where: { id: employerProfileId },
        data: {
          microsoftAccessToken: refreshed.accessToken,
          microsoftRefreshToken: refreshed.refreshToken,
          microsoftTokenExpiry: BigInt(refreshed.expiresAt)
        }
      });
      return refreshed.accessToken;
    } catch (err) {
      console.error("Failed to refresh Microsoft tokens:", err);
      return null;
    }
  }

  return employer.microsoftAccessToken;
}

export const interviewService = {
  
   //Fetch candidate profile details for schedule UI.
   
  async getCandidateProfile(employerId: string, candidateProfileId: string) {
    // Ensure requester is a valid employer account.
    await getEmployerProfileId(employerId);

    const candidate = await interviewRepository.findCandidateProfile(candidateProfileId);
    if (!candidate) {
      throw buildHttpError("Candidate profile not found", 404);
    }

    const fullName = [candidate.user.firstName, candidate.user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || "Candidate";

    return {
      id: candidate.id,
      name: fullName,
      email: candidate.user.email,
      headline: candidate.headline ?? "",
      skills: candidate.skills ?? [],
      location: candidate.location ?? null,
      bio: candidate.bio ?? null,
      linkedinUrl: candidate.linkedinUrl ?? null,
      githubUrl: candidate.githubUrl ?? null,
      portfolioUrl: candidate.portfolioUrl ?? null,
      cvUrl: candidate.cvUrl ?? null,
      profilePictureUrl: candidate.profilePictureUrl ?? null,
    };
  },

  
   //Create a draft interview.
   
  async createDraft(employerId: string, input: CreateInterviewInput): Promise<InterviewDTO> {
    const employerProfileId = await getEmployerProfileId(employerId);

    // to verify the job post belongs to this employer
    const jobPost = await interviewRepository.findJobPostForEmployer(input.jobPostId, employerProfileId);
    if (!jobPost) {
      throw buildHttpError("Job post not found or you do not have access", 404);
    }

    //  Try to find application; if not found, fetch candidate profile directly
    let candidateEmail: string;
    let candidateName: string;

    const application = await interviewRepository.findApplication(
      input.candidateProfileId,
      input.jobPostId
    );

    if (application) {
      // Application exists — use it
      candidateEmail = application.candidateProfile.user.email;
      candidateName = [
        application.candidateProfile.user.firstName,
        application.candidateProfile.user.lastName,
      ]
        .filter(Boolean)
        .join(" ") || "Candidate";
    } else {
      // No application — fetch candidate profile directly (allows testing without formal applications)
      const candidate = await interviewRepository.findCandidateProfile(input.candidateProfileId);
      if (!candidate) {
        throw buildHttpError("Candidate profile not found", 404);
      }
      candidateEmail = candidate.user.email;
      candidateName = [candidate.user.firstName, candidate.user.lastName]
        .filter(Boolean)
        .join(" ") || "Candidate";
    }

    //  Parse scheduledAt
    const scheduledAt = new Date(input.scheduledAt);

    //  Handle Calendar and Meeting Link Integration
    let meetingLink: string | undefined = input.meetingLink;
    let googleCalendarEventId: string | undefined;
    let googleCalendarLink: string | undefined;
    let microsoftCalendarEventId: string | undefined;
    let microsoftCalendarLink: string | undefined;

    const employerProfile = await prisma.employerProfile.findUnique({
      where: { id: employerProfileId },
      select: { calendarProvider: true, googleCalendarConnected: true, microsoftCalendarConnected: true }
    });
    const provider = employerProfile?.calendarProvider || (employerProfile?.googleCalendarConnected ? "google" : employerProfile?.microsoftCalendarConnected ? "microsoft" : undefined);

    if (input.meetingType === "ONLINE" && !meetingLink) {
      if (provider === "google") {
        const auth = await getEmployerGoogleAuth(employerProfileId);
        if (auth) {
          try {
            const calEvent = await googleCalendarService.createEvent(auth, {
              title: `Interview – ${candidateName} | ${jobPost.title}`,
              description: `Interview for ${jobPost.title} at ${jobPost.employer.companyName}`,
              startTime: scheduledAt,
              durationMinutes: 60,
              attendeeEmails: [candidateEmail, jobPost.employer.user.email].filter(Boolean) as string[],
              generateMeetLink: true,
            });

            meetingLink = calEvent.meetLink;
            googleCalendarEventId = calEvent.eventId;
            googleCalendarLink = calEvent.calendarLink;

            if (!meetingLink) {
              throw new Error("Google Calendar API succeeded but did not return a Google Meet link.");
            }
            
            console.log(`[Google Meet Generated] Link: ${meetingLink}, EventID: ${googleCalendarEventId}`);
          } catch (calErr) {
            console.error("Google Calendar event creation failed:", calErr);
            throw buildHttpError(`Failed to generate Google Meet link: ${calErr instanceof Error ? calErr.message : "Unknown error"}`, 400);
          }
        } else {
          throw buildHttpError("Google Calendar is not connected. Please connect your calendar in settings to generate Google Meet links.", 400);
        }
      } else if (provider === "microsoft") {
        const token = await getEmployerMicrosoftAuth(employerProfileId);
        if (token) {
          try {
            const calEvent = await microsoftCalendarService.createEvent(token, {
              title: `Interview – ${candidateName} | ${jobPost.title}`,
              description: `Interview for ${jobPost.title} at ${jobPost.employer.companyName}`,
              startTime: scheduledAt,
              durationMinutes: 60,
              attendeeEmails: [candidateEmail, jobPost.employer.user.email].filter(Boolean) as string[],
              generateMeetLink: true,
            });

            meetingLink = calEvent.meetLink;
            microsoftCalendarEventId = calEvent.eventId;
            microsoftCalendarLink = calEvent.calendarLink;

            if (!meetingLink) {
              // Teams link unavailable (e.g. personal account without Teams license).
              // Throw so the employer knows to use a Microsoft 365 work/school account.
              throw new Error(
                "Microsoft Calendar API succeeded but did not return a Teams meeting link. " +
                "Ensure the connected account is a Microsoft 365 work/school account with a Teams license."
              );
            } else {
              console.log(`[Microsoft Teams Generated] Link: ${meetingLink}, EventID: ${microsoftCalendarEventId}`);
            }
          } catch (calErr) {
            console.error("Microsoft Calendar event creation failed:", calErr);
            throw buildHttpError(`Failed to generate Microsoft Teams link: ${calErr instanceof Error ? calErr.message : "Unknown error"}`, 400);
          }
        } else {
          throw buildHttpError("Microsoft Calendar is not connected. Please connect your calendar in settings to generate Microsoft Teams links.", 400);
        }
      } else {
        throw buildHttpError("Calendar is not connected. Please connect your Google or Microsoft Calendar in settings to generate meeting links.", 400);
      }
    } else if (input.meetingType === "ONSITE") {
      if (provider === "google") {
        const auth = await getEmployerGoogleAuth(employerProfileId);
        if (auth) {
          try {
            const calEvent = await googleCalendarService.createEvent(auth, {
              title: `Interview – ${jobPost.title} (On-Site)`,
              description: `On-site interview at ${input.location}`,
              startTime: scheduledAt,
              durationMinutes: 60,
              location: input.location,
              attendeeEmails: [candidateEmail, jobPost.employer.user.email].filter(Boolean) as string[],
              generateMeetLink: false,
            });

            googleCalendarEventId = calEvent.eventId;
            googleCalendarLink = calEvent.calendarLink;
          } catch (calErr) {
            console.error("Google Calendar event creation failed:", calErr);
          }
        }
      } else if (provider === "microsoft") {
        const token = await getEmployerMicrosoftAuth(employerProfileId);
        if (token) {
          try {
            const calEvent = await microsoftCalendarService.createEvent(token, {
              title: `Interview – ${jobPost.title} (On-Site)`,
              description: `On-site interview at ${input.location}`,
              startTime: scheduledAt,
              durationMinutes: 60,
              location: input.location,
              attendeeEmails: [candidateEmail, jobPost.employer.user.email].filter(Boolean) as string[],
              generateMeetLink: false,
            });

            microsoftCalendarEventId = calEvent.eventId;
            microsoftCalendarLink = calEvent.calendarLink;
          } catch (calErr) {
            console.error("Microsoft Calendar event creation failed:", calErr);
          }
        }
      }
    }

    //  Persist draft interview to database
    const created = await interviewRepository.create(
      employerProfileId,
      input,
      scheduledAt,
      candidateEmail,
      { 
        meetingLink, 
        googleCalendarEventId, 
        googleCalendarLink,
        microsoftCalendarEventId,
        microsoftCalendarLink
      }
    );

    console.log(`[Interview Created] ID: ${created.id}, Type: ${input.meetingType}, MeetingLink: ${meetingLink}`);
    return mapToDTO(created);
  },

  /**
   * Get a single interview by ID.
   */
  async getById(id: string, employerId: string): Promise<InterviewDTO> {
    const employerProfileId = await getEmployerProfileId(employerId);
    const interview = await interviewRepository.findById(id, employerProfileId);
    if (!interview) {
      throw buildHttpError("Interview not found", 404);
    }
    return mapToDTO(interview);
  },

  /**
   * List all interviews for  employer.
   */
  async list(
    employerId: string,
    options: { status?: string; date?: string; page?: number; limit?: number }
  ) {
    const employerProfileId = await getEmployerProfileId(employerId);
    const { total, interviews } = await interviewRepository.findAll(employerProfileId, options);

    return {
      data: interviews.map(mapToDTO),
      pagination: {
        total,
        page: options.page ?? 1,
        limit: options.limit ?? 20,
        totalPages: Math.ceil(total / (options.limit ?? 20)),
      },
    };
  },

  /**
   * Get all dates in a month that have scheduled interviews.
   * Used to show dots on the calendar.
   */
  async getScheduledDates(
    employerId: string,
    year: number,
    month: number
  ): Promise<string[]> {
    const employerProfileId = await getEmployerProfileId(employerId);
    return interviewRepository.getScheduledDates(employerProfileId, year, month);
  },

  /**
   * Update draft interview data (date, time, type).
   * Regenerates Google Calendar event if time changed.
   */
  async updateDraft(
    id: string,
    employerId: string,
    input: UpdateInterviewInput
  ): Promise<InterviewDTO> {
    const employerProfileId = await getEmployerProfileId(employerId);
    const existing = await interviewRepository.findById(id, employerProfileId);
    if (!existing) {
      throw buildHttpError("Interview not found", 404);
    }

    // Cannot update a scheduled interview — only DRAFT allowed
    if ((existing as any).status === "SCHEDULED") {
      throw buildHttpError(
        "Cannot edit a scheduled interview. Cancel it first.",
        400
      );
    }

    const updateData: any = {};
    let shouldSyncCalendar = false;

    if (input.scheduledAt) {
      updateData.scheduledAt = new Date(input.scheduledAt);
      if (updateData.scheduledAt.getTime() !== existing.scheduledAt.getTime()) {
        shouldSyncCalendar = true;
      }
    }
    if (input.meetingType !== undefined) {
      updateData.meetingType = input.meetingType;
      if (updateData.meetingType !== existing.meetingType) {
        shouldSyncCalendar = true;
      }
    }
    if (input.location !== undefined) updateData.location = input.location;
    if (input.additionalInfo !== undefined) updateData.additionalInfo = input.additionalInfo;
    if (input.meetingLink !== undefined) updateData.meetingLink = input.meetingLink;
    if (input.emailBody !== undefined) updateData.emailBody = input.emailBody;
    if (input.status !== undefined) updateData.status = input.status;

    const employerProfile = await prisma.employerProfile.findUnique({
      where: { id: employerProfileId },
      select: { calendarProvider: true, googleCalendarConnected: true, microsoftCalendarConnected: true }
    });
    const provider = employerProfile?.calendarProvider || (employerProfile?.googleCalendarConnected ? "google" : employerProfile?.microsoftCalendarConnected ? "microsoft" : undefined);

    // Handle Meeting Link generation if switched to ONLINE or no link exists
    if (
      (input.meetingType === "ONLINE" || (existing.meetingType === "ONLINE" && !input.meetingType)) &&
      !input.meetingLink &&
      !existing.meetingLink
    ) {
      const candidateName = [
        existing.candidate?.user?.firstName,
        existing.candidate?.user?.lastName,
      ].filter(Boolean).join(" ") || "Candidate";

      if (provider === "google") {
        const auth = await getEmployerGoogleAuth(employerProfileId);
        if (auth) {
          try {
            const calEvent = await googleCalendarService.createEvent(auth, {
              title: `Interview – ${candidateName} | ${existing.jobPost.title}`,
              description: `Interview for ${existing.jobPost.title} at ${existing.employer.companyName}`,
              startTime: updateData.scheduledAt || existing.scheduledAt,
              durationMinutes: 60,
              attendeeEmails: [
                existing.candidateEmail,
                existing.employer.user.email
              ].filter(Boolean) as string[],
              generateMeetLink: true,
            });

            if (!calEvent.meetLink) {
              throw new Error("Google Calendar API succeeded but did not return a Google Meet link.");
            }

            updateData.meetingLink = calEvent.meetLink;
            updateData.googleCalendarEventId = calEvent.eventId;
            updateData.googleCalendarLink = calEvent.calendarLink;
            console.log(`[Google Meet Updated/Generated] Link: ${updateData.meetingLink}`);
            shouldSyncCalendar = false; // Already created/updated
          } catch (calErr) {
            console.error("Google Calendar update failed:", calErr);
            throw buildHttpError(`Failed to generate Google Meet link: ${calErr instanceof Error ? calErr.message : "Unknown error"}`, 400);
          }
        } else {
          throw buildHttpError("Google Calendar is not connected. Cannot generate Google Meet link.", 400);
        }
      } else if (provider === "microsoft") {
        const token = await getEmployerMicrosoftAuth(employerProfileId);
        if (token) {
          try {
            const calEvent = await microsoftCalendarService.createEvent(token, {
              title: `Interview – ${candidateName} | ${existing.jobPost.title}`,
              description: `Interview for ${existing.jobPost.title} at ${existing.employer.companyName}`,
              startTime: updateData.scheduledAt || existing.scheduledAt,
              durationMinutes: 60,
              attendeeEmails: [
                existing.candidateEmail,
                existing.employer.user.email
              ].filter(Boolean) as string[],
              generateMeetLink: true,
            });

            if (!calEvent.meetLink) {
              throw new Error(
                "Microsoft Calendar API succeeded but did not return a Teams meeting link. " +
                "Ensure the connected account is a Microsoft 365 work/school account with a Teams license."
              );
            }

            updateData.meetingLink = calEvent.meetLink;
            updateData.microsoftCalendarEventId = calEvent.eventId;
            updateData.microsoftCalendarLink = calEvent.calendarLink;
            if (calEvent.meetLink) {
              console.log(`[Microsoft Teams Updated/Generated] Link: ${updateData.meetingLink}`);
            }
            shouldSyncCalendar = false; // Already created/updated
          } catch (calErr) {
            console.error("Microsoft Calendar update failed:", calErr);
            throw buildHttpError(`Failed to generate Microsoft Teams link: ${calErr instanceof Error ? calErr.message : "Unknown error"}`, 400);
          }
        } else {
          throw buildHttpError("Microsoft Calendar is not connected. Cannot generate Microsoft Teams link.", 400);
        }
      } else {
        throw buildHttpError("Calendar is not connected. Please connect your Google or Microsoft Calendar in settings to generate meeting links.", 400);
      }
    }

    // Sync existing calendar event if time/type changed but we didn't re-create it above
    if (shouldSyncCalendar) {
      if (provider === "google" && (existing as any).googleCalendarEventId) {
        const auth = await getEmployerGoogleAuth(employerProfileId);
        if (auth) {
          try {
            await googleCalendarService.updateEventTime(
              auth,
              (existing as any).googleCalendarEventId,
              updateData.scheduledAt || existing.scheduledAt
            );
          } catch (err) {
            console.error("Failed to sync Google calendar event time:", err);
          }
        }
      } else if (provider === "microsoft" && (existing as any).microsoftCalendarEventId) {
        const token = await getEmployerMicrosoftAuth(employerProfileId);
        if (token) {
          try {
            await microsoftCalendarService.updateEventTime(
              token,
              (existing as any).microsoftCalendarEventId,
              updateData.scheduledAt || existing.scheduledAt
            );
          } catch (err) {
            console.error("Failed to sync Microsoft calendar event time:", err);
          }
        }
      }
    }

    const updated = await interviewRepository.update(id, employerProfileId, updateData);
    return mapToDTO(updated);
  },

  /**
   * Generate an email preview (subject + HTML body) based on current form data.
   * Does NOT save anything — purely for frontend display.
   */
  async generateEmailPreview(
    employerId: string,
    input: GenerateEmailInput
  ): Promise<{ subject: string; body: string }> {
    const employerProfileId = await getEmployerProfileId(employerId);
    // Fetch job post and candidate for real data in preview
    const [jobPost, candidate] = await Promise.all([
      interviewRepository.findJobPostForEmployer(input.jobPostId, employerProfileId),
      interviewRepository.findCandidateProfile(input.candidateProfileId),
    ]);

    if (!jobPost) throw buildHttpError("Job post not found", 404);
    if (!candidate) throw buildHttpError("Candidate profile not found", 404);

    const candidateName = [candidate.user.firstName, candidate.user.lastName]
      .filter(Boolean)
      .join(" ") || "Candidate";

    const senderName = [
      jobPost.employer.user.firstName,
      jobPost.employer.user.lastName,
    ]
      .filter(Boolean)
      .join(" ") || jobPost.employer.companyName;

    const emailData: InterviewEmailData = {
      candidateName,
      candidateEmail: candidate.user.email,
      jobTitle: jobPost.title,
      companyName: jobPost.employer.companyName,
      senderName,
      senderEmail: jobPost.employer.user.email,
      scheduledAt: new Date(input.scheduledAt),
      meetingType: input.meetingType,
      location: input.location,
      meetingLink: input.meetingLink,
      additionalInfo: input.additionalInfo,
      isReschedule: input.isReschedule,
      customBody: null,
    };

    return {
      subject: buildInterviewEmailSubject(emailData),
      body: buildInterviewEmailHtml(emailData),
    };
  },

  /**
   * Confirm and send the interview invitation email.
   * Changes status from DRAFT → SCHEDULED.
   * Records the time the email was sent.
   */
  async scheduleAndSend(id: string, employerId: string): Promise<InterviewDTO> {
    const employerProfileId = await getEmployerProfileId(employerId);
    const existing = await interviewRepository.findById(id, employerProfileId);
    if (!existing) {
      throw buildHttpError("Interview not found", 404);
    }

    if ((existing as any).status === "SCHEDULED") {
      throw buildHttpError("Email has already been sent for this interview", 400);
    }

    const emailData = buildEmailData(existing as any);

    // Update status to SCHEDULED before sending email.
    // This prevents a successful email from becoming lost if the
    // transporter or DB update fails after the email is already sent.
    const scheduled = await interviewRepository.update(id, employerProfileId, {
      status: "SCHEDULED",
      emailSentAt: null,
    });

    console.log(
      `[ScheduleAndSend] Interview ID: ${id}, Email recipient: ${emailData.candidateEmail}, MeetingType: ${emailData.meetingType}, MeetingLink: ${emailData.meetingLink}`
    );

    let emailSent = false;
    try {
      await sendInterviewEmail(emailData);
      emailSent = true;
    } catch (emailErr) {
      console.error("[ScheduleAndSend] Email delivery failed:", emailErr);
    }

    let updated = scheduled;
    if (emailSent) {
      try {
        updated = await interviewRepository.update(id, employerProfileId, {
          emailSentAt: new Date(),
        });
      } catch (updateErr) {
        console.error(
          `[ScheduleAndSend] Failed to update emailSentAt for interview ${id}:`,
          updateErr
        );
      }
    }

    if (!emailSent) {
      console.warn(`[ScheduleAndSend] Interview scheduled but email was not delivered: ${id}`);
    }

    try {
      return mapToDTO(updated);
    } catch (mapErr) {
      console.error(`[ScheduleAndSend] Failed to map scheduled interview to DTO for ${id}:`, mapErr);

      return {
        id: updated.id,
        status: updated.status,
        scheduledAt: updated.scheduledAt instanceof Date ? updated.scheduledAt.toISOString() : String(updated.scheduledAt),
        meetingType: updated.meetingType,
        location: updated.location ?? null,
        meetingLink: updated.meetingLink ?? null,
        googleCalendarLink: updated.googleCalendarLink ?? updated.microsoftCalendarLink ?? null,
        additionalInfo: updated.additionalInfo ?? null,
        emailBody: updated.emailBody ?? null,
        emailSentAt: updated.emailSentAt instanceof Date ? updated.emailSentAt.toISOString() : null,
        candidateEmail: updated.candidateEmail,
        rescheduledFromId: updated.rescheduledFromId ?? null,
        rescheduledToId: updated.rescheduledToId ?? null,
        candidate: {
          id: updated.candidate?.id ?? "",
          name: [updated.candidate?.user?.firstName, updated.candidate?.user?.lastName]
            .filter(Boolean)
            .join(" ") || "Candidate",
          email: updated.candidate?.user?.email ?? updated.candidateEmail,
          headline: updated.candidate?.headline ?? null,
          skills: updated.candidate?.skills ?? [],
        },
        jobPost: {
          id: updated.jobPost?.id ?? "",
          title: updated.jobPost?.title ?? "",
          type: updated.jobPost?.type === "JOB" ? "Job" : "Internship",
          companyName: updated.employer?.companyName ?? "",
        },
        employer: {
          companyName: updated.employer?.companyName ?? "",
          email: updated.employer?.user?.email ?? "",
        },
        createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : String(updated.createdAt),
        updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : String(updated.updatedAt),
      } as InterviewDTO;
    }
  },

  /**
   * Cancel an interview (DRAFT or SCHEDULED).
   * Removes the Google Calendar event if one exists.
   */
  async cancel(id: string, employerId: string): Promise<void> {
    const employerProfileId = await getEmployerProfileId(employerId);
    const existing = await interviewRepository.findById(id, employerProfileId);
    if (!existing) {
      throw buildHttpError("Interview not found", 404);
    }

    const googleEventId = (existing as any).googleCalendarEventId;
    if (googleEventId && googleCalendarService.isConfigured()) {
      try {
        const auth = await getEmployerGoogleAuth(employerProfileId);
        if (auth) {
          await googleCalendarService.deleteEvent(auth, googleEventId);
        }
      } catch (err) {
        console.error("Failed to delete Google Calendar event:", err);
      }
    }

    const microsoftEventId = (existing as any).microsoftCalendarEventId;
    if (microsoftEventId) {
      try {
        const token = await getEmployerMicrosoftAuth(employerProfileId);
        if (token) {
          await microsoftCalendarService.deleteEvent(token, microsoftEventId);
        }
      } catch (err) {
        console.error("Failed to delete Microsoft Calendar event:", err);
      }
    }

    // Mark as CANCELLED instead of hard delete (keeps record for history/reference)
    await interviewRepository.update(id, employerProfileId, { status: "CANCELLED" });
    console.log(`[Interview Cancelled] ID: ${id}`);
  },

  /**
   * Save the custom email body for a draft interview.
   * Called when the employer edits the email in the preview panel.
   */
  async saveEmailBody(
    id: string,
    employerId: string,
    emailBody: string
  ): Promise<InterviewDTO> {
    const employerProfileId = await getEmployerProfileId(employerId);
    const existing = await interviewRepository.findById(id, employerProfileId);
    if (!existing) {
      throw buildHttpError("Interview not found", 404);
    }

    const updated = await interviewRepository.update(id, employerProfileId, {
      emailBody,
    });

    return mapToDTO(updated);
  },

  /**
   * Generate a cancellation email preview.
   * Returns subject and body for the cancellation email.
   */
  async generateCancelEmailPreview(
    id: string,
    employerId: string,
    reason: string
  ): Promise<{ subject: string; body: string }> {
    const employerProfileId = await getEmployerProfileId(employerId);
    const interview = await interviewRepository.findById(id, employerProfileId);
    if (!interview) {
      throw buildHttpError("Interview not found", 404);
    }

    const candidateName = [
      (interview as any).candidate?.user?.firstName,
      (interview as any).candidate?.user?.lastName,
    ]
      .filter(Boolean)
      .join(" ") || "Candidate";

    const companyName =
      (interview as any).employer?.companyName || "Hiring Team";

    const scheduledDate = new Date((interview as any).scheduledAt);
    const formattedDate = scheduledDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const subject = `Interview Cancellation – ${(interview as any).jobPost?.title || "Position"}`;

    const body = `Dear ${candidateName},

We regret to inform you that we need to cancel the interview that was scheduled for ${formattedDate} at ${formattedTime}.

Cancellation Reason:
${reason}

We sincerely apologize for any inconvenience this may cause. We remain interested in your profile and may reach out in the future with other opportunities that align with your background and experience.

If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
${companyName}`;

    return { subject, body };
  },

  /**
   * Cancel an interview and send cancellation email to the candidate.
   * Changes status SCHEDULED → CANCELLED.
   * Removes Google Calendar event.
   * Sends email with cancellation reason.
   */
  async cancelAndSendEmail(
    id: string,
    employerId: string,
    reason: string,
    emailBody: string
  ): Promise<InterviewDTO> {
    const employerProfileId = await getEmployerProfileId(employerId);
    const existing = await interviewRepository.findById(id, employerProfileId);
    if (!existing) {
      throw buildHttpError("Interview not found", 404);
    }

    // Only cancel SCHEDULED interviews (not DRAFT)
    if ((existing as any).status !== "SCHEDULED") {
      throw buildHttpError(
        "Only scheduled interviews can be cancelled this way",
        400
      );
    }

    // Remove Google Calendar event before cancelling the interview.
    const googleEventId = (existing as any).googleCalendarEventId;
    if (googleEventId) {
      const auth = await getEmployerGoogleAuth(employerProfileId);
      if (auth) {
        try {
          await googleCalendarService.deleteEvent(auth, googleEventId);
          console.log(`[CancelAndSendEmail] Google Calendar event deleted: ${googleEventId}`);
        } catch (err) {
          console.error(
            "Failed to delete Google Calendar event:",
            err
          );
        }
      }
    }

    const microsoftEventId = (existing as any).microsoftCalendarEventId;
    if (microsoftEventId) {
      const token = await getEmployerMicrosoftAuth(employerProfileId);
      if (token) {
        try {
          await microsoftCalendarService.deleteEvent(token, microsoftEventId);
          console.log(`[CancelAndSendEmail] Microsoft Calendar event deleted: ${microsoftEventId}`);
        } catch (err) {
          console.error(
            "Failed to delete Microsoft Calendar event:",
            err
          );
        }
      }
    }

    // Update status to CANCELLED
    const updated = await interviewRepository.update(id, employerProfileId, {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancellationReason: reason,
    });

    console.log(`[CancelAndSendEmail] Interview cancelled: ${id}`);

    // Send cancellation email after the interview is cancelled so email is only delivered when the cancellation succeeds.
    try {
      console.log(
        `[CancelAndSendEmail] Sending cancellation email to ${(existing as any).candidateEmail}`
      );

      const candidateName = [
        (existing as any).candidate?.user?.firstName,
        (existing as any).candidate?.user?.lastName,
      ]
        .filter(Boolean)
        .join(" ") || "Candidate";

      await sendInterviewEmail({
        candidateName,
        candidateEmail: (existing as any).candidateEmail,
        jobTitle: (existing as any).jobPost?.title || "",
        companyName: (existing as any).employer?.companyName || "",
        senderName: [
          (existing as any).employer?.user?.firstName,
          (existing as any).employer?.user?.lastName,
        ]
          .filter(Boolean)
          .join(" ") || (existing as any).employer?.companyName,
        senderEmail: (existing as any).employer?.user?.email || "",
        scheduledAt: new Date((existing as any).scheduledAt),
        meetingType: (existing as any).meetingType,
        location: (existing as any).location,
        meetingLink: (existing as any).meetingLink,
        additionalInfo: (existing as any).additionalInfo,
        customBody: emailBody,
        isCancellation: true,
        cancellationReason: reason,
      } as any);
    } catch (err) {
      console.error("Failed to send cancellation email, continuing cancellation anyway:", err);
    }

    return mapToDTO(updated);
  },
};