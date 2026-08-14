"use strict";
// Service layer for interview scheduling.
// Owns all business logic: ownership checks, Google Calendar integration,
// email generation, draft management, and confirmation.
//
// Controllers call service methods — never the repository directly.
// Repository calls are always scoped to the authenticated employerId for security.
Object.defineProperty(exports, "__esModule", { value: true });
exports.interviewService = void 0;
const db_1 = require("../../../config/db");
const interview_repository_1 = require("./interview.repository");
const googleCalendar_1 = require("../../../utils/googleCalendar");
const interviewEmail_1 = require("../../../utils/interviewEmail");
const buildHttpError = (message, statusCode) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};
// ─── DTO mapper ───────────────────────────────────────────────────────────────
/**
 * Map a raw Prisma interview record to the clean DTO sent to the frontend.
 * SECURITY: This is the single place where we control what data leaves the API.
 */
function mapToDTO(raw) {
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
        googleCalendarLink: raw.googleCalendarLink ?? null,
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
// ─── Helper to build email data from raw record ───────────────────────────────
function buildEmailData(raw, customBody) {
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
// Helper to convert User ID to Employer Profile ID
async function getEmployerProfileId(userId) {
    const employerProfile = await db_1.prisma.employerProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!employerProfile) {
        throw buildHttpError("Employer profile not found", 404);
    }
    return employerProfile.id;
}
/**
 * Helper to get a Google Auth client for a specific employer.
 * Returns null if the employer hasn't connected their calendar.
 */
async function getEmployerGoogleAuth(employerProfileId) {
    const employer = await db_1.prisma.employerProfile.findUnique({
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
    const auth = (0, googleCalendar_1.getEmployerGoogleClient)(tokens);
    // Auto-update tokens in DB if they are refreshed by the library
    auth.on("tokens", async (newTokens) => {
        try {
            const updateData = {};
            if (newTokens.access_token)
                updateData.googleAccessToken = newTokens.access_token;
            if (newTokens.refresh_token)
                updateData.googleRefreshToken = newTokens.refresh_token;
            if (newTokens.expiry_date)
                updateData.googleTokenExpiry = BigInt(newTokens.expiry_date);
            if (Object.keys(updateData).length > 0) {
                await db_1.prisma.employerProfile.update({
                    where: { id: employerProfileId },
                    data: updateData
                });
                console.log(`[Google Tokens Refreshed] Employer: ${employerProfileId}`);
            }
        }
        catch (err) {
            console.error("Failed to update refreshed Google tokens in DB:", err);
        }
    });
    return auth;
}
exports.interviewService = {
    /**
     * Fetch candidate profile details for schedule UI.
     */
    async getCandidateProfile(employerId, candidateProfileId) {
        // Ensure requester is a valid employer account.
        await getEmployerProfileId(employerId);
        const candidate = await interview_repository_1.interviewRepository.findCandidateProfile(candidateProfileId);
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
        };
    },
    /**
     * Create a draft interview.
     * For ONLINE meetings, creates a Google Calendar event with Meet link.
     * For ONSITE, creates a calendar event with location.
     * Does NOT send email yet — that happens in scheduleAndSend.
     */
    async createDraft(employerId, input) {
        // 0. Convert User ID to Employer Profile ID
        const employerProfileId = await getEmployerProfileId(employerId);
        // 1. Verify the job post belongs to this employer
        const jobPost = await interview_repository_1.interviewRepository.findJobPostForEmployer(input.jobPostId, employerProfileId);
        if (!jobPost) {
            throw buildHttpError("Job post not found or you do not have access", 404);
        }
        // 2. Try to find application; if not found, fetch candidate profile directly
        let candidateEmail;
        let candidateName;
        const application = await interview_repository_1.interviewRepository.findApplication(input.candidateProfileId, input.jobPostId);
        if (application) {
            // Application exists — use it
            candidateEmail = application.candidateProfile.user.email;
            candidateName = [
                application.candidateProfile.user.firstName,
                application.candidateProfile.user.lastName,
            ]
                .filter(Boolean)
                .join(" ") || "Candidate";
        }
        else {
            // No application — fetch candidate profile directly (allows testing without formal applications)
            const candidate = await interview_repository_1.interviewRepository.findCandidateProfile(input.candidateProfileId);
            if (!candidate) {
                throw buildHttpError("Candidate profile not found", 404);
            }
            candidateEmail = candidate.user.email;
            candidateName = [candidate.user.firstName, candidate.user.lastName]
                .filter(Boolean)
                .join(" ") || "Candidate";
        }
        // 3. Parse scheduledAt
        const scheduledAt = new Date(input.scheduledAt);
        // 4. Handle Google Meet and Calendar Integration
        let meetingLink = input.meetingLink;
        let googleCalendarEventId;
        let googleCalendarLink;
        const auth = await getEmployerGoogleAuth(employerProfileId);
        if (input.meetingType === "ONLINE" && !meetingLink) {
            if (auth) {
                try {
                    const calEvent = await googleCalendar_1.googleCalendarService.createEvent(auth, {
                        title: `Interview – ${candidateName} | ${jobPost.title}`,
                        description: `Interview for ${jobPost.title} at ${jobPost.employer.companyName}`,
                        startTime: scheduledAt,
                        durationMinutes: 60,
                        attendeeEmails: [candidateEmail, jobPost.employer.user.email].filter(Boolean),
                        generateMeetLink: true,
                    });
                    meetingLink = calEvent.meetLink;
                    googleCalendarEventId = calEvent.eventId;
                    googleCalendarLink = calEvent.calendarLink;
                    if (!meetingLink) {
                        throw new Error("Google Calendar API succeeded but did not return a Google Meet link.");
                    }
                    console.log(`[Google Meet Generated] Link: ${meetingLink}, EventID: ${googleCalendarEventId}`);
                }
                catch (calErr) {
                    console.error("Google Calendar event creation failed:", calErr);
                    throw buildHttpError(`Failed to generate Google Meet link: ${calErr instanceof Error ? calErr.message : "Unknown error"}`, 400);
                }
            }
            else {
                throw buildHttpError("Google Calendar is not connected. Please connect your calendar in settings to generate Google Meet links.", 400);
            }
        }
        else if (input.meetingType === "ONSITE" && auth) {
            try {
                const calEvent = await googleCalendar_1.googleCalendarService.createEvent(auth, {
                    title: `Interview – ${jobPost.title} (On-Site)`,
                    description: `On-site interview at ${input.location}`,
                    startTime: scheduledAt,
                    durationMinutes: 60,
                    location: input.location,
                    attendeeEmails: [candidateEmail, jobPost.employer.user.email].filter(Boolean),
                    generateMeetLink: false,
                });
                googleCalendarEventId = calEvent.eventId;
                googleCalendarLink = calEvent.calendarLink;
            }
            catch (calErr) {
                console.error("Google Calendar event creation failed:", calErr);
            }
        }
        // 5. Persist draft interview to database
        const created = await interview_repository_1.interviewRepository.create(employerProfileId, input, scheduledAt, candidateEmail, { meetingLink, googleCalendarEventId, googleCalendarLink });
        console.log(`[Interview Created] ID: ${created.id}, Type: ${input.meetingType}, MeetingLink: ${meetingLink}`);
        return mapToDTO(created);
    },
    /**
     * Get a single interview by ID.
     * SECURITY: scoped to authenticated employerId.
     */
    async getById(id, employerId) {
        const employerProfileId = await getEmployerProfileId(employerId);
        const interview = await interview_repository_1.interviewRepository.findById(id, employerProfileId);
        if (!interview) {
            throw buildHttpError("Interview not found", 404);
        }
        return mapToDTO(interview);
    },
    /**
     * List all interviews for this employer.
     */
    async list(employerId, options) {
        const employerProfileId = await getEmployerProfileId(employerId);
        const { total, interviews } = await interview_repository_1.interviewRepository.findAll(employerProfileId, options);
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
    async getScheduledDates(employerId, year, month) {
        const employerProfileId = await getEmployerProfileId(employerId);
        return interview_repository_1.interviewRepository.getScheduledDates(employerProfileId, year, month);
    },
    /**
     * Update draft interview data (date, time, type, etc.).
     * Regenerates Google Calendar event if time changed.
     */
    async updateDraft(id, employerId, input) {
        const employerProfileId = await getEmployerProfileId(employerId);
        const existing = await interview_repository_1.interviewRepository.findById(id, employerProfileId);
        if (!existing) {
            throw buildHttpError("Interview not found", 404);
        }
        // Cannot update a sent interview (SCHEDULED) — only DRAFT allowed
        if (existing.status === "SCHEDULED") {
            throw buildHttpError("Cannot edit a scheduled interview. Cancel it first.", 400);
        }
        const updateData = {};
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
        if (input.location !== undefined)
            updateData.location = input.location;
        if (input.additionalInfo !== undefined)
            updateData.additionalInfo = input.additionalInfo;
        if (input.meetingLink !== undefined)
            updateData.meetingLink = input.meetingLink;
        if (input.emailBody !== undefined)
            updateData.emailBody = input.emailBody;
        if (input.status !== undefined)
            updateData.status = input.status;
        const auth = await getEmployerGoogleAuth(employerProfileId);
        // Handle Google Meet generation if switched to ONLINE or no link exists
        if ((input.meetingType === "ONLINE" || (existing.meetingType === "ONLINE" && !input.meetingType)) &&
            !input.meetingLink &&
            !existing.meetingLink) {
            if (auth) {
                try {
                    const candidateName = [
                        existing.candidate?.user?.firstName,
                        existing.candidate?.user?.lastName,
                    ].filter(Boolean).join(" ") || "Candidate";
                    const calEvent = await googleCalendar_1.googleCalendarService.createEvent(auth, {
                        title: `Interview – ${candidateName} | ${existing.jobPost.title}`,
                        description: `Interview for ${existing.jobPost.title} at ${existing.employer.companyName}`,
                        startTime: updateData.scheduledAt || existing.scheduledAt,
                        durationMinutes: 60,
                        attendeeEmails: [
                            existing.candidateEmail,
                            existing.employer.user.email
                        ].filter(Boolean),
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
                }
                catch (calErr) {
                    console.error("Google Calendar update failed:", calErr);
                    throw buildHttpError(`Failed to generate Google Meet link: ${calErr instanceof Error ? calErr.message : "Unknown error"}`, 400);
                }
            }
            else {
                throw buildHttpError("Google Calendar is not connected. Cannot generate Google Meet link.", 400);
            }
        }
        // Sync existing calendar event if time/type changed but we didn't re-create it above
        if (shouldSyncCalendar && existing.googleCalendarEventId && auth) {
            try {
                await googleCalendar_1.googleCalendarService.updateEventTime(auth, existing.googleCalendarEventId, updateData.scheduledAt || existing.scheduledAt);
            }
            catch (err) {
                console.error("Failed to sync calendar event time:", err);
            }
        }
        const updated = await interview_repository_1.interviewRepository.update(id, employerProfileId, updateData);
        return mapToDTO(updated);
    },
    /**
     * Generate an email preview (subject + HTML body) based on current form data.
     * Does NOT save anything — purely for frontend display.
     */
    async generateEmailPreview(employerId, input) {
        const employerProfileId = await getEmployerProfileId(employerId);
        // Fetch job post and candidate for real data in preview
        const [jobPost, candidate] = await Promise.all([
            interview_repository_1.interviewRepository.findJobPostForEmployer(input.jobPostId, employerProfileId),
            interview_repository_1.interviewRepository.findCandidateProfile(input.candidateProfileId),
        ]);
        if (!jobPost)
            throw buildHttpError("Job post not found", 404);
        if (!candidate)
            throw buildHttpError("Candidate profile not found", 404);
        const candidateName = [candidate.user.firstName, candidate.user.lastName]
            .filter(Boolean)
            .join(" ") || "Candidate";
        const senderName = [
            jobPost.employer.user.firstName,
            jobPost.employer.user.lastName,
        ]
            .filter(Boolean)
            .join(" ") || jobPost.employer.companyName;
        const emailData = {
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
            subject: (0, interviewEmail_1.buildInterviewEmailSubject)(emailData),
            body: (0, interviewEmail_1.buildInterviewEmailHtml)(emailData),
        };
    },
    /**
     * Confirm and send the interview invitation email.
     * Changes status from DRAFT → SCHEDULED.
     * Records the time the email was sent.
     */
    async scheduleAndSend(id, employerId) {
        const employerProfileId = await getEmployerProfileId(employerId);
        const existing = await interview_repository_1.interviewRepository.findById(id, employerProfileId);
        if (!existing) {
            throw buildHttpError("Interview not found", 404);
        }
        if (existing.status === "SCHEDULED") {
            throw buildHttpError("Email has already been sent for this interview", 400);
        }
        const emailData = buildEmailData(existing);
        // Send the email — if delivery fails, still schedule the interview but log the failure.
        console.log(`[ScheduleAndSend] Interview ID: ${id}, Email recipient: ${emailData.candidateEmail}, MeetingType: ${emailData.meetingType}, MeetingLink: ${emailData.meetingLink}`);
        let emailSent = false;
        try {
            await (0, interviewEmail_1.sendInterviewEmail)(emailData);
            emailSent = true;
        }
        catch (emailErr) {
            console.error("[ScheduleAndSend] Email delivery failed:", emailErr);
        }
        // Update status to SCHEDULED. If email delivery failed, keep emailSentAt null.
        const updated = await interview_repository_1.interviewRepository.update(id, employerProfileId, {
            status: "SCHEDULED",
            emailSentAt: emailSent ? new Date() : null,
        });
        if (!emailSent) {
            console.warn(`[ScheduleAndSend] Interview scheduled but email was not delivered: ${id}`);
        }
        return mapToDTO(updated);
    },
    /**
     * Cancel an interview (DRAFT or SCHEDULED).
     * Removes the Google Calendar event if one exists.
     */
    async cancel(id, employerId) {
        const employerProfileId = await getEmployerProfileId(employerId);
        const existing = await interview_repository_1.interviewRepository.findById(id, employerProfileId);
        if (!existing) {
            throw buildHttpError("Interview not found", 404);
        }
        const googleEventId = existing.googleCalendarEventId;
        if (googleEventId && googleCalendar_1.googleCalendarService.isConfigured()) {
            try {
                const auth = await getEmployerGoogleAuth(employerProfileId);
                if (auth) {
                    await googleCalendar_1.googleCalendarService.deleteEvent(auth, googleEventId);
                }
            }
            catch (err) {
                console.error("Failed to delete Google Calendar event:", err);
            }
        }
        // Mark as CANCELLED instead of hard delete (keeps record for history/reference)
        await interview_repository_1.interviewRepository.update(id, employerProfileId, { status: "CANCELLED" });
        console.log(`[Interview Cancelled] ID: ${id}`);
    },
    /**
     * Save the custom email body for a draft interview.
     * Called when the employer edits the email in the preview panel.
     */
    async saveEmailBody(id, employerId, emailBody) {
        const employerProfileId = await getEmployerProfileId(employerId);
        const existing = await interview_repository_1.interviewRepository.findById(id, employerProfileId);
        if (!existing) {
            throw buildHttpError("Interview not found", 404);
        }
        const updated = await interview_repository_1.interviewRepository.update(id, employerProfileId, {
            emailBody,
        });
        return mapToDTO(updated);
    },
    /**
     * Generate a cancellation email preview.
     * Returns subject and body for the cancellation email.
     */
    async generateCancelEmailPreview(id, employerId, reason) {
        const employerProfileId = await getEmployerProfileId(employerId);
        const interview = await interview_repository_1.interviewRepository.findById(id, employerProfileId);
        if (!interview) {
            throw buildHttpError("Interview not found", 404);
        }
        const candidateName = [
            interview.candidate?.user?.firstName,
            interview.candidate?.user?.lastName,
        ]
            .filter(Boolean)
            .join(" ") || "Candidate";
        const companyName = interview.employer?.companyName || "Hiring Team";
        const scheduledDate = new Date(interview.scheduledAt);
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
        const subject = `Interview Cancellation – ${interview.jobPost?.title || "Position"}`;
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
    async cancelAndSendEmail(id, employerId, reason, emailBody) {
        const employerProfileId = await getEmployerProfileId(employerId);
        const existing = await interview_repository_1.interviewRepository.findById(id, employerProfileId);
        if (!existing) {
            throw buildHttpError("Interview not found", 404);
        }
        // Only cancel SCHEDULED interviews (not DRAFT)
        if (existing.status !== "SCHEDULED") {
            throw buildHttpError("Only scheduled interviews can be cancelled this way", 400);
        }
        // Send cancellation email
        try {
            console.log(`[CancelAndSendEmail] Sending cancellation email to ${existing.candidateEmail}`);
            // Create and send email
            const candidateName = [
                existing.candidate?.user?.firstName,
                existing.candidate?.user?.lastName,
            ]
                .filter(Boolean)
                .join(" ") || "Candidate";
            await (0, interviewEmail_1.sendInterviewEmail)({
                candidateName,
                candidateEmail: existing.candidateEmail,
                jobTitle: existing.jobPost?.title || "",
                companyName: existing.employer?.companyName || "",
                senderName: [
                    existing.employer?.user?.firstName,
                    existing.employer?.user?.lastName,
                ]
                    .filter(Boolean)
                    .join(" ") || existing.employer?.companyName,
                senderEmail: existing.employer?.user?.email || "",
                scheduledAt: new Date(existing.scheduledAt),
                meetingType: existing.meetingType,
                location: existing.location,
                meetingLink: existing.meetingLink,
                additionalInfo: existing.additionalInfo,
                customBody: emailBody,
                isCancellation: true,
                cancellationReason: reason,
            });
        }
        catch (err) {
            console.error("Failed to send cancellation email:", err);
            throw buildHttpError(`Failed to send cancellation email: ${err.message}`, 500);
        }
        // Remove Google Calendar event
        const googleEventId = existing.googleCalendarEventId;
        if (googleEventId) {
            const auth = await getEmployerGoogleAuth(employerProfileId);
            if (auth) {
                try {
                    await googleCalendar_1.googleCalendarService.deleteEvent(auth, googleEventId);
                    console.log(`[CancelAndSendEmail] Google Calendar event deleted: ${googleEventId}`);
                }
                catch (err) {
                    console.error("Failed to delete Google Calendar event:", err);
                    // Don't fail the operation if calendar delete fails
                }
            }
        }
        // Update status to CANCELLED
        const updated = await interview_repository_1.interviewRepository.update(id, employerProfileId, {
            status: "CANCELLED",
            cancelledAt: new Date(),
            cancellationReason: reason,
        });
        console.log(`[CancelAndSendEmail] Interview cancelled: ${id}`);
        return mapToDTO(updated);
    },
};
//# sourceMappingURL=interview.service.js.map