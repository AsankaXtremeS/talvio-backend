import { prisma } from "../../../config/db";
import { InterviewMeetingType, InterviewStatus } from "@prisma/client";
import { CreateInterviewInput, UpdateInterviewInput } from "./interview.validation";

// ─── Select shape reused across queries ───────────────────────────────────────
// Only expose columns needed by the frontend — never leak sensitive data.

const interviewSelect = {
  id: true,
  status: true,
  scheduledAt: true,
  meetingType: true,
  location: true,
  meetingLink: true,
  googleCalendarEventId: true,
  googleCalendarLink: true,
  microsoftCalendarEventId: true,
  microsoftCalendarLink: true,
  additionalInfo: true,
  emailBody: true,
  emailSentAt: true,
  candidateEmail: true,
  rescheduledFromId: true,
  rescheduledToId: true,
  createdAt: true,
  updatedAt: true,

  // Employer — return only non-sensitive company info
  employer: {
    select: {
      id: true,
      companyName: true,
      companyLocation: true,
      user: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },

  // Candidate — return only what the employer needs to display
  candidate: {
    select: {
      id: true,
      headline: true,
      skills: true,
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },

  // Job post — title and type for the email/display
  jobPost: {
    select: {
      id: true,
      title: true,
      type: true,
      location: true,
      employer: {
        select: { companyName: true },
      },
    },
  },
} as const;

// ─── Repository ───────────────────────────────────────────────────────────────

export const interviewRepository = {
  /**
   * Create a new interview record (initially as DRAFT).
   * Returns the full interview with relations.
   */
  async create(
    employerId: string,
    data: CreateInterviewInput,
    scheduledAt: Date,
    candidateEmail: string,
    options?: {
      meetingLink?: string;
      googleCalendarEventId?: string;
      googleCalendarLink?: string;
      microsoftCalendarEventId?: string;
      microsoftCalendarLink?: string;
    }
  ) {
    return prisma.interview.create({
      data: {
        employerId,
        candidateProfileId: data.candidateProfileId,
        jobPostId: data.jobPostId,
        scheduledAt,
        meetingType: data.meetingType,
        status: "DRAFT",
        location: data.location ?? null,
        meetingLink: options?.meetingLink ?? null,
        additionalInfo: data.additionalInfo ?? null,
        emailBody: data.emailBody ?? null,
        googleCalendarEventId: options?.googleCalendarEventId ?? null,
        googleCalendarLink: options?.googleCalendarLink ?? null,
        microsoftCalendarEventId: options?.microsoftCalendarEventId ?? null,
        microsoftCalendarLink: options?.microsoftCalendarLink ?? null,
        candidateEmail,
        rescheduledFromId: data.rescheduledFromId ?? null,
      },
      select: interviewSelect,
    });
  },

  /**
   * Find a single interview by ID.
   * always pass employerId to prevent cross-employer data access.
   */
  async findById(id: string, employerId: string) {
    return prisma.interview.findFirst({
      where: { id, employerId },
      select: interviewSelect,
    });
  },

  /**
   * List all interviews for an employer.
   * Optionally filter by status, paginate.
   */
  async findAll(
    employerId: string,
    options: {
      status?: string;
      date?: string;
      page?: number;
      limit?: number;
    } = {}
  ) {
    const { status, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { employerId };
    if (status) {
      where.status = status;
    }
    if (options.date) {
      const dateObj = new Date(options.date);
      const startOfDay = new Date(dateObj);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj);
      endOfDay.setUTCHours(23, 59, 59, 999);

      where.scheduledAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const [total, interviews] = await Promise.all([
      prisma.interview.count({ where }),
      prisma.interview.findMany({
        where,
        select: interviewSelect,
        orderBy: { scheduledAt: "asc" },
        skip,
        take: limit,
      }),
    ]);

    return { total, interviews };
  },

  /**
   * Find all scheduled interviews for a specific date (for calendar display).
   * Returns only interviews with status=SCHEDULED.
   */
  async findByDate(employerId: string, date: Date) {
    // Build start/end of day in UTC for accurate range query
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return prisma.interview.findMany({
      where: {
        employerId,
        status: "SCHEDULED",
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: interviewSelect,
      orderBy: { scheduledAt: "asc" },
    });
  },

  /**
   * Get all distinct dates that have scheduled interviews for calendar dots.
   */
  async getScheduledDates(employerId: string, year: number, month: number) {
    // month is 1-based (1=January, 12=December)
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const interviews = await prisma.interview.findMany({
      where: {
        employerId,
        status: "SCHEDULED",
        scheduledAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: { scheduledAt: true },
    });

    // Deduplicate and return as YYYY-MM-DD strings
    const dates = new Set(
      interviews.map((i) => i.scheduledAt.toISOString().split("T")[0])
    );
    return Array.from(dates);
  },

  /**
   * Update an interview.
   * SECURITY: always scoped to employerId to prevent unauthorized updates.
   */
  async update(
    id: string,
    employerId: string,
    data: Partial<{
      scheduledAt: Date;
      meetingType: InterviewMeetingType;
      status: InterviewStatus;
      location: string | null;
      meetingLink: string | null;
      additionalInfo: string | null;
      emailBody: string | null;
      googleCalendarEventId: string | null;
      googleCalendarLink: string | null;
      microsoftCalendarEventId: string | null;
      microsoftCalendarLink: string | null;
      emailSentAt: Date | null;
      rescheduledFromId: string | null;
      rescheduledToId: string | null;
      cancelledAt: Date | null;
      cancellationReason: string | null;
    }>
  ) {
    return prisma.interview.update({
      where: { id },
      data: {
        ...data,
        // Verify ownership — Prisma will throw if id+employerId don't match
      },
      select: interviewSelect,
    });
  },

  /**
   * Hard delete an interview.
   * SECURITY: scoped to employerId.
   */
  async delete(id: string, employerId: string) {
    return prisma.interview.delete({
      where: { id },
    });
  },

  /**
   * Check that the candidate's profile belongs to the given application for this job post.
   * Used before scheduling to ensure the candidate actually applied.
   */
  async findApplication(candidateProfileId: string, jobPostId: string) {
    return prisma.application.findFirst({
      where: { candidateProfileId, jobPostId },
      select: {
        id: true,
        applicationStatus: true,
        candidateProfile: {
          select: {
            id: true,
            skills: true,
            headline: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Fetch job post with employer info — needed for email generation.
   * SECURITY: scoped to employerId to prevent leaking other employers' posts.
   */
  async findJobPostForEmployer(jobPostId: string, employerId: string) {
    return prisma.jobPost.findFirst({
      where: { id: jobPostId, employerId },
      select: {
        id: true,
        title: true,
        type: true,
        location: true,
        employer: {
          select: {
            companyName: true,
            companyLocation: true,
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  },

  /**
   * Fetch minimal candidate info for email generation.
   */
  async findCandidateProfile(candidateProfileId: string) {
    return prisma.candidateProfile.findUnique({
      where: { id: candidateProfileId },
      select: {
        id: true,
        headline: true,
        skills: true,
        location: true,
        bio: true,
        linkedinUrl: true,
        githubUrl: true,
        portfolioUrl: true,
        cvUrl: true,
        profilePictureUrl: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  },
};