// Interview email template builder.
// Generates HTML email content for interview scheduling confirmation and cancellation.
// Returns both the HTML body and the plain text subject line.
//
// Used by:
//   - interviewService.generateEmailPreview() — for frontend preview before sending
//   - interviewService.scheduleAndSendEmail()  — for actual sending via nodemailer
//   - interviewService.generateCancelEmailPreview() — for cancellation preview
//   - interviewService.cancelAndSendEmail() — for cancellation sending via nodemailer

import nodemailer from "nodemailer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InterviewEmailData {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  senderName: string;          // Employer's name
  senderEmail: string;         // Employer's email
  scheduledAt: Date;           // UTC datetime of the interview
  meetingType: "ONLINE" | "ONSITE" | "PHONE";
  location?: string | null;    // For ONSITE
  meetingLink?: string | null; // For ONLINE (Google Meet)
  additionalInfo?: string | null;
  isReschedule?: boolean;      // Flag for reschedule email
  isCancellation?: boolean;    // Flag for cancellation email
  cancellationReason?: string; // Reason for cancellation
  // Optional override — employer can edit before sending
  customBody?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format a UTC Date into a human-friendly string.
 * e.g. "Monday, April 14, 2026 at 10:30 AM (UTC)"
 */
function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

/**
 * Format only the date portion for subject line.
 * e.g. "April 14, 2026"
 */
function formatDateOnly(date: Date): string {
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function detectMeetingProvider(meetingLink?: string | null): "Google Meet" | "Microsoft Teams" | "Skype" | "Video Call" {
  if (!meetingLink) return "Video Call";
  const url = meetingLink.toLowerCase();
  if (url.includes("teams.microsoft.com") || url.includes("teams.live.com")) {
    return "Microsoft Teams";
  }
  if (url.includes("meet.google.com")) {
    return "Google Meet";
  }
  if (url.includes("skype.com") || url.startsWith("skype:")) {
    return "Skype";
  }
  return "Video Call";
}

/**
 * Get a human label for meeting type.
 * For ONLINE meetings, detects the provider from the meeting link URL.
 */
function getMeetingTypeLabel(type: string, meetingLink?: string | null): string {
  if (type === "ONLINE") return `Online (${detectMeetingProvider(meetingLink)})`;
  if (type === "ONSITE") return "On-Site";
  if (type === "PHONE") return "Phone Call";
  return type;
}

/**
 * Convert plain text line breaks (\n) into HTML line breaks (<br />).
 * This ensures paragraphs and point-wise formatting are preserved in HTML emails.
 */
function formatLineBreaks(text: string | null | undefined): string {
  if (!text) return "";
  // First, escape any existing HTML to prevent XSS if the input is untrusted
  // (though in this app, only employers can reach this point)
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  
  // Then convert newlines to <br />
  return escaped.replace(/\n/g, "<br />");
}

// ─── Email Template Builder ───────────────────────────────────────────────────

/**
 * Build the HTML email body for an interview invitation.
 * Returns the full HTML string — ready to be embedded in sendMail.
 */
export function buildInterviewEmailHtml(data: InterviewEmailData): string {
  // If employer provided a custom body, wrap it in the branded template
  // Note: if the custom body already contains HTML from the frontend, formatLineBreaks might escape it.
  // However, it's safer to treat it as plain text if it comes from a textarea.
  const bodyContent = data.customBody
    ? `<div style="font-size:14px;color:#374151;line-height:1.7;">${formatLineBreaks(data.customBody)}</div>`
    : buildDefaultBody(data);

  const bannerContent = data.isCancellation
    ? `
      <p style="margin:0;font-size:20px;font-weight:700;color:#991B1B;">
        Interview Cancelled ❌
      </p>
      <p style="margin:8px 0 0;font-size:14px;color:#B91C1C;">
        Your interview for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong> has been cancelled.
      </p>
    `
    : data.isReschedule
    ? `
      <p style="margin:0;font-size:20px;font-weight:700;color:#7C2D12;">
        Interview Rescheduled ⏰
      </p>
      <p style="margin:8px 0 0;font-size:14px;color:#B45309;">
        Your interview for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong> has been rescheduled.
      </p>
    `
    : `
      <p style="margin:0;font-size:20px;font-weight:700;color:#3730A3;">
        Congratulations, ${data.candidateName}! 🎊
      </p>
      <p style="margin:8px 0 0;font-size:14px;color:#4F46E5;">
        You have been selected for an interview for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong>.
      </p>
    `;

  const bannerBg = data.isCancellation ? "#FEE2E2" : data.isReschedule ? "#FFEDD5" : "#EEF2FF";
  const bannerBorder = data.isCancellation ? "#FECACA" : data.isReschedule ? "#FED7AA" : "#E0E7FF";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F4F6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);padding:32px 40px;">
              <table width="100%">
                <tr>
                  <td>
                    <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Talvio</p>
                    <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase;">Employer & Hiring Platform</p>
                  </td>
                  <td align="right">
                    <div style="background:rgba(255,255,255,0.15);border-radius:50%;width:48px;height:48px;display:inline-flex;align-items:center;justify-content:center;">
                      <span style="font-size:24px;">${data.isCancellation ? "❌" : data.isReschedule ? "⏰" : "🎉"}</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── BANNER ── -->
          <tr>
            <td style="background:${bannerBg};padding:24px 40px;border-bottom:2px solid ${bannerBorder};">
              ${bannerContent}
            </td>
          </tr>

          <!-- ── BODY CONTENT ── -->
          <tr>
            <td style="padding:32px 40px;">
              ${bodyContent}

              ${!data.isCancellation ? `
              <!-- ── INTERVIEW DETAILS CARD ── -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:12px;margin:24px 0;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #E0E7FF;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:#6366F1;text-transform:uppercase;letter-spacing:0.5px;">Interview Details</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">

                      <tr>
                        <td style="padding:6px 0;width:140px;vertical-align:top;">
                          <p style="margin:0;font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.4px;">📅 Date & Time</p>
                        </td>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${formatDateTime(data.scheduledAt)}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="margin:0;font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.4px;">💼 Position</p>
                        </td>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${data.jobTitle}</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="margin:0;font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.4px;">🖥️ Format</p>
                        </td>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${getMeetingTypeLabel(data.meetingType, data.meetingLink)}</p>
                        </td>
                      </tr>

                      ${
                        data.meetingType === "ONLINE" && data.meetingLink
                          ? `
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="margin:0;font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.4px;">🔗 Meeting Link</p>
                        </td>
                        <td style="padding:6px 0;vertical-align:top;">
                          <a href="${data.meetingLink}" style="font-size:14px;font-weight:600;color:#4F46E5;text-decoration:none;">${data.meetingLink}</a>
                        </td>
                      </tr>`
                          : ""
                      }

                      ${
                        data.meetingType === "ONSITE" && data.location
                          ? `
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="margin:0;font-size:12px;font-weight:600;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.4px;">📍 Location</p>
                        </td>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${data.location}</p>
                        </td>
                      </tr>`
                          : ""
                      }

                    </table>
                  </td>
                </tr>
              </table>
              ` : ""}

              ${
                data.additionalInfo && !data.isCancellation
                  ? `
              <!-- ── ADDITIONAL INFORMATION ── -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;margin:0 0 24px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 24px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.4px;">📝 Additional Information</p>
                    <p style="margin:0;font-size:14px;color:#78350F;line-height:1.6;">${formatLineBreaks(data.additionalInfo)}</p>
                  </td>
                </tr>
              </table>`
                  : ""
              }

              <!-- ── ONLINE JOIN BUTTON ── -->
              ${
                !data.isCancellation && data.meetingType === "ONLINE" && data.meetingLink
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${data.meetingLink}"
                       style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#fff;text-decoration:none;border-radius:50px;font-size:15px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(79,70,229,0.4);">
                      Join ${detectMeetingProvider(data.meetingLink)} →
                    </a>
                  </td>
                </tr>
              </table>`
                  : ""
              }
            </td>
          </tr>

          <!-- ── SENDER INFO ── -->
          <tr>
            <td style="background:#F9FAFB;border-top:1px solid #E5E7EB;padding:24px 40px;">
              <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#111827;">${data.senderName}</p>
              <p style="margin:0;font-size:12px;color:#6B7280;">${data.companyName}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#9CA3AF;">${data.senderEmail}</p>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background:#1F2937;padding:20px 40px;border-radius:0 0 16px 16px;">
              <p style="margin:0;font-size:12px;color:#6B7280;text-align:center;">
                This email was sent via Talvio · Employer &amp; Hiring Platform<br/>
                If you have any questions, reply to this email or contact ${data.senderEmail}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build the default body paragraphs when no custom body is provided.
 */
function buildDefaultBody(data: InterviewEmailData): string {
  const cancelMessage = data.isCancellation ? `
    <div style="background:#FEE2E2;border-left:4px solid #DC2626;padding:16px;border-radius:8px;margin:0 0 16px;">
      <p style="margin:0;font-size:14px;color:#7F1D1D;font-weight:600;">
        ❌ Interview Cancelled
      </p>
      <p style="margin:8px 0 0;font-size:13px;color:#991B1B;line-height:1.6;">
        We regret to inform you that your scheduled interview has been cancelled. We apologize for any inconvenience this may cause.
      </p>
      ${data.cancellationReason ? `
      <p style="margin:8px 0 0;font-size:13px;color:#991B1B;line-height:1.6;">
        <strong>Reason:</strong> ${formatLineBreaks(data.cancellationReason)}
      </p>
      ` : ""}
    </div>
  ` : "";

  const rescheduleMessage = data.isReschedule && !data.isCancellation ? `
    <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:16px;border-radius:8px;margin:0 0 16px;">
      <p style="margin:0;font-size:14px;color:#92400E;font-weight:600;">
        ⏰ Interview Rescheduled
      </p>
      <p style="margin:8px 0 0;font-size:13px;color:#B45309;line-height:1.6;">
        We apologize for any inconvenience. Your interview has been rescheduled due to scheduling changes. 
        Please see the updated details below.
      </p>
    </div>
  ` : "";

  const greeting = data.isCancellation 
    ? `<p style="margin:0 0 16px;font-size:15px;color:#111827;font-weight:600;">Dear ${data.candidateName},</p>`
    : data.isReschedule 
    ? `<p style="margin:0 0 16px;font-size:15px;color:#111827;font-weight:600;">Hi ${data.candidateName},</p>`
    : `<p style="margin:0 0 16px;font-size:15px;color:#111827;font-weight:600;">Dear ${data.candidateName},</p>`;

  const introMessage = data.isCancellation
    ? `We regret to inform you that we need to cancel the interview that was scheduled for <strong>${formatDateTime(data.scheduledAt)}</strong>.`
    : data.isReschedule
    ? `Your interview for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong> has been rescheduled.`
    : `We are pleased to inform you that you have been shortlisted for the <strong>${data.jobTitle}</strong> position at <strong>${data.companyName}</strong>. We were impressed with your application and would like to invite you for an interview.`;

  const meetingProviderName = detectMeetingProvider(data.meetingLink);
  const nextSteps = data.isCancellation
    ? `We remain interested in your profile and may reach out in the future with other opportunities that align with your background and experience.`
    : `Please review the updated interview details below and confirm your availability.
      ${data.meetingType === "ONLINE" ? `A ${meetingProviderName} link has been provided for your convenience.` : ""}
      ${data.meetingType === "ONSITE" ? "Please arrive 10 minutes early at the location provided." : ""}
      ${data.meetingType === "PHONE" ? "We will call you at your registered phone number." : ""}`;

  return `
    ${greeting}
    ${cancelMessage}
    ${rescheduleMessage}
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7;">
      ${introMessage}
      ${!data.isReschedule && !data.isCancellation ? `We would like to invite you for an interview.` : ``}
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7;">
      ${nextSteps}
    </p>
  `;
}

/**
 * Build the email subject line.
 */
export function buildInterviewEmailSubject(data: InterviewEmailData): string {
  if (data.isCancellation) {
    return `Interview Cancellation – ${data.jobTitle} at ${data.companyName}`;
  }
  const prefix = data.isReschedule ? "[Rescheduled] " : "";
  return `${prefix}Interview Invitation – ${data.jobTitle} at ${data.companyName} | ${formatDateOnly(data.scheduledAt)}`;
}

// ─── Nodemailer Sender ────────────────────────────────────────────────────────

/** Build a nodemailer transporter from env */
function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send the interview invitation email to the candidate.
 */
export async function sendInterviewEmail(data: InterviewEmailData): Promise<void> {
  const transporter = buildTransporter();
  const from = process.env.SMTP_FROM || "noreply@talvio.com";

  await transporter.sendMail({
    from,
    to: data.candidateEmail,
    replyTo: data.senderEmail,   // Replies go to the employer's email
    subject: buildInterviewEmailSubject(data),
    html: buildInterviewEmailHtml(data),
  });
}