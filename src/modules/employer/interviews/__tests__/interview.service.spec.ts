import { interviewService } from "../interview.service";
import { interviewRepository } from "../interview.repository";
import { googleCalendarService } from "../../../../utils/googleCalendar";
import { sendInterviewEmail } from "../../../../utils/interviewEmail";

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock("../interview.repository");
jest.mock("../../../../utils/googleCalendar", () => ({
  googleCalendarService: {
    createEvent: jest.fn(),
    updateEventTime: jest.fn(),
    deleteEvent: jest.fn(),
    isConfigured: jest.fn().mockReturnValue(true),
  },
  getEmployerGoogleClient: jest.fn(),
}));
jest.mock("../../../../utils/interviewEmail", () => ({
  sendInterviewEmail: jest.fn(),
  buildInterviewEmailHtml: jest.fn().mockReturnValue("<html>email</html>"),
  buildInterviewEmailSubject: jest.fn().mockReturnValue("Interview Invitation"),
}));
jest.mock("../../../../config/db", () => ({
  prisma: {
    employerProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// ── Shared fixtures ────────────────────────────────────────────────────────────

const EMPLOYER_USER_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const EMPLOYER_PROFILE_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";
const INTERVIEW_ID = "c3d4e5f6-a7b8-9012-cdef-123456789012";

const mockEmployerProfile: {
  id: string;
  googleCalendarConnected: boolean;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiry: null;
} = {
  id: EMPLOYER_PROFILE_ID,
  googleCalendarConnected: false,
  googleAccessToken: null,
  googleRefreshToken: null,
  googleTokenExpiry: null,
};

const CANDIDATE_PROFILE_ID = "e5f6a7b8-c9d0-1234-efab-345678901234";
const JOB_POST_ID = "d4e5f6a7-b8c9-0123-defa-234567890123";

const mockRawInterview = {
  id: INTERVIEW_ID,
  status: "DRAFT",
  scheduledAt: new Date("2026-06-01T10:00:00Z"),
  meetingType: "ONLINE",
  location: null,
  meetingLink: "https://meet.google.com/abc",
  googleCalendarLink: null,
  googleCalendarEventId: null,
  additionalInfo: null,
  emailBody: null,
  emailSentAt: null,
  candidateEmail: "candidate@example.com",
  rescheduledFromId: null,
  rescheduledToId: null,
  createdAt: new Date("2026-05-01T00:00:00Z"),
  updatedAt: new Date("2026-05-01T00:00:00Z"),
  candidate: {
    id: CANDIDATE_PROFILE_ID,
    headline: "Developer",
    skills: ["TypeScript"],
    user: { id: "f6a7b8c9-d0e1-2345-fabc-456789012345", email: "candidate@example.com", firstName: "Jane", lastName: "Doe" },
  },
  employer: {
    id: EMPLOYER_PROFILE_ID,
    companyName: "Talvio Inc",
    user: { email: "employer@talvio.com", firstName: "Bob", lastName: "Smith" },
  },
  jobPost: {
    id: JOB_POST_ID,
    title: "Backend Engineer",
    type: "JOB",
    employer: { companyName: "Talvio Inc" },
  },
};

const mockJobPost = {
  id: JOB_POST_ID,
  title: "Backend Engineer",
  type: "JOB",
  location: "Remote",
  employer: {
    companyName: "Talvio Inc",
    companyLocation: "Colombo",
    user: { email: "employer@talvio.com", firstName: "Bob", lastName: "Smith" },
  },
};

const mockCandidate = {
  id: CANDIDATE_PROFILE_ID,
  headline: "Developer",
  skills: ["TypeScript"],
  location: "Colombo",
  bio: null,
  linkedinUrl: null,
  githubUrl: null,
  portfolioUrl: null,
  cvUrl: null,
  profilePictureUrl: null,
  user: { id: "f6a7b8c9-d0e1-2345-fabc-456789012345", email: "candidate@example.com", firstName: "Jane", lastName: "Doe" },
};

// ── Helper: wire prisma.employerProfile.findUnique ────────────────────────────

function mockPrismaEmployerProfile(overrides?: Partial<typeof mockEmployerProfile>) {
  const { prisma } = require("../../../../config/db");
  prisma.employerProfile.findUnique.mockResolvedValue({ ...mockEmployerProfile, ...overrides });
}

// ─────────────────────────────────────────────────────────────────────────────

describe("interviewService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaEmployerProfile();
  });

  // ── getCandidateProfile ────────────────────────────────────────────────────

  describe("getCandidateProfile", () => {
    it("should return candidate profile for a valid employer", async () => {
      (interviewRepository.findCandidateProfile as jest.Mock).mockResolvedValue(mockCandidate);

      const result = await interviewService.getCandidateProfile(EMPLOYER_USER_ID, "cand-1");

      expect(result.name).toBe("Jane Doe");
      expect(result.email).toBe("candidate@example.com");
      expect(result.headline).toBe("Developer");
    });

    it("should throw 404 if candidate is not found", async () => {
      (interviewRepository.findCandidateProfile as jest.Mock).mockResolvedValue(null);

      await expect(
        interviewService.getCandidateProfile(EMPLOYER_USER_ID, "cand-none")
      ).rejects.toMatchObject({ message: "Candidate profile not found", statusCode: 404 });
    });

    it("should throw 404 if employer profile does not exist", async () => {
      const { prisma } = require("../../../../config/db");
      prisma.employerProfile.findUnique.mockResolvedValue(null);

      await expect(
        interviewService.getCandidateProfile(EMPLOYER_USER_ID, "cand-1")
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── createDraft ────────────────────────────────────────────────────────────

  describe("createDraft", () => {
    const baseInput = {
      jobPostId: "d4e5f6a7-b8c9-0123-defa-234567890123",
      candidateProfileId: "e5f6a7b8-c9d0-1234-efab-345678901234",
      scheduledAt: "2099-06-01T10:00:00Z",
      meetingType: "ONLINE" as const,
      meetingLink: "https://meet.google.com/abc",
      isReschedule: false,
    } satisfies import("../interview.validation").CreateInterviewInput;

    it("should create a DRAFT interview when candidate has an application", async () => {
      const { prisma } = require("../../../../config/db");
      prisma.employerProfile.findUnique
        .mockResolvedValueOnce({ id: EMPLOYER_PROFILE_ID })  // 1st call: getEmployerProfileId
        .mockResolvedValueOnce({ ...mockEmployerProfile });   // 2nd call: getEmployerGoogleAuth
      (interviewRepository.findJobPostForEmployer as jest.Mock).mockResolvedValue(mockJobPost);
      (interviewRepository.findApplication as jest.Mock).mockResolvedValue({
        id: "app-1",
        applicationStatus: "PENDING",
        candidateProfile: mockCandidate,
      });
      (interviewRepository.create as jest.Mock).mockResolvedValue(mockRawInterview);

      const result = await interviewService.createDraft(EMPLOYER_USER_ID, baseInput);

      expect(interviewRepository.create).toHaveBeenCalled();
      expect(result.status).toBe("DRAFT");
      expect(result.meetingLink).toBe("https://meet.google.com/abc");
    });

    it("should create a DRAFT using direct candidate lookup when no application exists", async () => {
      const { prisma } = require("../../../../config/db");
      prisma.employerProfile.findUnique
        .mockResolvedValueOnce({ id: EMPLOYER_PROFILE_ID })  // 1st call: getEmployerProfileId
        .mockResolvedValueOnce({ ...mockEmployerProfile });   // 2nd call: getEmployerGoogleAuth
      (interviewRepository.findJobPostForEmployer as jest.Mock).mockResolvedValue(mockJobPost);
      (interviewRepository.findApplication as jest.Mock).mockResolvedValue(null);
      (interviewRepository.findCandidateProfile as jest.Mock).mockResolvedValue(mockCandidate);
      (interviewRepository.create as jest.Mock).mockResolvedValue(mockRawInterview);

      const result = await interviewService.createDraft(EMPLOYER_USER_ID, baseInput);

      expect(interviewRepository.findCandidateProfile).toHaveBeenCalledWith(CANDIDATE_PROFILE_ID);
      expect(result.id).toBe(INTERVIEW_ID);
    });

    it("should throw 404 if job post does not belong to employer", async () => {
      (interviewRepository.findJobPostForEmployer as jest.Mock).mockResolvedValue(null);

      await expect(
        interviewService.createDraft(EMPLOYER_USER_ID, baseInput)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("should throw 404 if candidate profile not found (no application)", async () => {
      (interviewRepository.findJobPostForEmployer as jest.Mock).mockResolvedValue(mockJobPost);
      (interviewRepository.findApplication as jest.Mock).mockResolvedValue(null);
      (interviewRepository.findCandidateProfile as jest.Mock).mockResolvedValue(null);

      await expect(
        interviewService.createDraft(EMPLOYER_USER_ID, baseInput)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("should throw 400 if ONLINE type and no Google Calendar connected and no meetingLink", async () => {
      (interviewRepository.findJobPostForEmployer as jest.Mock).mockResolvedValue(mockJobPost);
      (interviewRepository.findApplication as jest.Mock).mockResolvedValue(null);
      (interviewRepository.findCandidateProfile as jest.Mock).mockResolvedValue(mockCandidate);

      const inputWithoutLink = { ...baseInput, meetingLink: undefined };

      await expect(
        interviewService.createDraft(EMPLOYER_USER_ID, inputWithoutLink as any)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("should generate Google Meet link when Google Calendar is connected", async () => {
      mockPrismaEmployerProfile({
        googleCalendarConnected: true,
        googleAccessToken: "access-token",
        googleRefreshToken: "refresh-token",
      });

      const { getEmployerGoogleClient } = require("../../../../utils/googleCalendar");
      const mockAuth = { on: jest.fn() };
      (getEmployerGoogleClient as jest.Mock).mockReturnValue(mockAuth);

      (googleCalendarService.createEvent as jest.Mock).mockResolvedValue({
        meetLink: "https://meet.google.com/generated",
        eventId: "event-id-1",
        calendarLink: "https://calendar.google.com/event-id-1",
      });

      (interviewRepository.findJobPostForEmployer as jest.Mock).mockResolvedValue(mockJobPost);
      (interviewRepository.findApplication as jest.Mock).mockResolvedValue(null);
      (interviewRepository.findCandidateProfile as jest.Mock).mockResolvedValue(mockCandidate);
      (interviewRepository.create as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        meetingLink: "https://meet.google.com/generated",
      });

      const inputWithoutLink = { ...baseInput, meetingLink: undefined };
      const result = await interviewService.createDraft(EMPLOYER_USER_ID, inputWithoutLink as any);

      expect(googleCalendarService.createEvent).toHaveBeenCalled();
      expect(result.meetingLink).toBe("https://meet.google.com/generated");
    });
  });

  // ── getById ────────────────────────────────────────────────────────────────

  describe("getById", () => {
    it("should return a mapped DTO for a valid interview", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(mockRawInterview);

      const result = await interviewService.getById(INTERVIEW_ID, EMPLOYER_USER_ID);

      expect(result.id).toBe(INTERVIEW_ID);
      expect(result.candidate.name).toBe("Jane Doe");
      expect(result.jobPost.title).toBe("Backend Engineer");
    });

    it("should throw 404 if interview not found", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        interviewService.getById("non-existent", EMPLOYER_USER_ID)
      ).rejects.toMatchObject({ statusCode: 404, message: "Interview not found" });
    });
  });

  // ── list ───────────────────────────────────────────────────────────────────

  describe("list", () => {
    it("should return paginated interview list", async () => {
      (interviewRepository.findAll as jest.Mock).mockResolvedValue({
        total: 1,
        interviews: [mockRawInterview],
      });

      const result = await interviewService.list(EMPLOYER_USER_ID, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it("should calculate totalPages correctly for multiple records", async () => {
      (interviewRepository.findAll as jest.Mock).mockResolvedValue({
        total: 25,
        interviews: Array(10).fill(mockRawInterview),
      });

      const result = await interviewService.list(EMPLOYER_USER_ID, { page: 1, limit: 10 });

      expect(result.pagination.totalPages).toBe(3);
    });

    it("should default page to 1 and limit to 20", async () => {
      (interviewRepository.findAll as jest.Mock).mockResolvedValue({ total: 0, interviews: [] });

      const result = await interviewService.list(EMPLOYER_USER_ID, {});

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  // ── getScheduledDates ──────────────────────────────────────────────────────

  describe("getScheduledDates", () => {
    it("should return scheduled date strings for a month", async () => {
      (interviewRepository.getScheduledDates as jest.Mock).mockResolvedValue([
        "2026-06-01",
        "2026-06-15",
      ]);

      const result = await interviewService.getScheduledDates(EMPLOYER_USER_ID, 2026, 6);

      expect(result).toEqual(["2026-06-01", "2026-06-15"]);
    });
  });

  // ── updateDraft ────────────────────────────────────────────────────────────

  describe("updateDraft", () => {
    it("should update a DRAFT interview", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(mockRawInterview);
      const updatedRaw = { ...mockRawInterview, additionalInfo: "Bring your ID" };
      (interviewRepository.update as jest.Mock).mockResolvedValue(updatedRaw);

      const result = await interviewService.updateDraft(INTERVIEW_ID, EMPLOYER_USER_ID, {
        additionalInfo: "Bring your ID",
      });

      expect(result.additionalInfo).toBe("Bring your ID");
      expect(interviewRepository.update).toHaveBeenCalled();
    });

    it("should throw 404 if interview not found", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        interviewService.updateDraft(INTERVIEW_ID, EMPLOYER_USER_ID, {})
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("should throw 400 when trying to update a SCHEDULED interview", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "SCHEDULED",
      });

      await expect(
        interviewService.updateDraft(INTERVIEW_ID, EMPLOYER_USER_ID, { additionalInfo: "X" })
      ).rejects.toMatchObject({ statusCode: 400, message: "Cannot edit a scheduled interview. Cancel it first." });
    });
  });

  // ── generateEmailPreview ───────────────────────────────────────────────────

  describe("generateEmailPreview", () => {
    const previewInput = {
      jobPostId: JOB_POST_ID,
      candidateProfileId: CANDIDATE_PROFILE_ID,
      scheduledAt: "2099-06-01T10:00:00Z",
      meetingType: "ONLINE" as const,
      isReschedule: false,
    } satisfies import("../interview.validation").GenerateEmailInput;

    it("should return subject and body for a valid preview request", async () => {
      (interviewRepository.findJobPostForEmployer as jest.Mock).mockResolvedValue(mockJobPost);
      (interviewRepository.findCandidateProfile as jest.Mock).mockResolvedValue(mockCandidate);

      const result = await interviewService.generateEmailPreview(EMPLOYER_USER_ID, previewInput);

      expect(result).toHaveProperty("subject");
      expect(result).toHaveProperty("body");
    });

    it("should throw 404 if job post not found", async () => {
      (interviewRepository.findJobPostForEmployer as jest.Mock).mockResolvedValue(null);
      (interviewRepository.findCandidateProfile as jest.Mock).mockResolvedValue(mockCandidate);

      await expect(
        interviewService.generateEmailPreview(EMPLOYER_USER_ID, previewInput)
      ).rejects.toMatchObject({ statusCode: 404, message: "Job post not found" });
    });

    it("should throw 404 if candidate not found", async () => {
      (interviewRepository.findJobPostForEmployer as jest.Mock).mockResolvedValue(mockJobPost);
      (interviewRepository.findCandidateProfile as jest.Mock).mockResolvedValue(null);

      await expect(
        interviewService.generateEmailPreview(EMPLOYER_USER_ID, previewInput)
      ).rejects.toMatchObject({ statusCode: 404, message: "Candidate profile not found" });
    });
  });

  // ── scheduleAndSend ────────────────────────────────────────────────────────

  describe("scheduleAndSend", () => {
    it("should change status to SCHEDULED and send email", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(mockRawInterview);
      (sendInterviewEmail as jest.Mock).mockResolvedValue(undefined);
      (interviewRepository.update as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "SCHEDULED",
        emailSentAt: new Date(),
      });

      const result = await interviewService.scheduleAndSend(INTERVIEW_ID, EMPLOYER_USER_ID);

      expect(sendInterviewEmail).toHaveBeenCalled();
      expect(result.status).toBe("SCHEDULED");
    });

    it("should still schedule interview even if email delivery fails", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(mockRawInterview);
      (sendInterviewEmail as jest.Mock).mockRejectedValue(new Error("SMTP error"));
      (interviewRepository.update as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "SCHEDULED",
        emailSentAt: null,
      });

      const result = await interviewService.scheduleAndSend(INTERVIEW_ID, EMPLOYER_USER_ID);

      expect(result.status).toBe("SCHEDULED");
      expect(result.emailSentAt).toBeNull();
    });

    it("should throw 404 if interview not found", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        interviewService.scheduleAndSend(INTERVIEW_ID, EMPLOYER_USER_ID)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("should throw 400 if interview is already SCHEDULED", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "SCHEDULED",
      });

      await expect(
        interviewService.scheduleAndSend(INTERVIEW_ID, EMPLOYER_USER_ID)
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Email has already been sent for this interview",
      });
    });
  });

  // ── cancel ─────────────────────────────────────────────────────────────────

  describe("cancel", () => {
    it("should cancel a DRAFT interview and mark as CANCELLED", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(mockRawInterview);
      (interviewRepository.update as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "CANCELLED",
      });

      await interviewService.cancel(INTERVIEW_ID, EMPLOYER_USER_ID);

      expect(interviewRepository.update).toHaveBeenCalledWith(
        INTERVIEW_ID,
        EMPLOYER_PROFILE_ID,
        { status: "CANCELLED" }
      );
    });

    it("should delete Google Calendar event if one exists", async () => {
      mockPrismaEmployerProfile({
        googleCalendarConnected: true,
        googleAccessToken: "access-token",
        googleRefreshToken: "refresh-token",
      });
      const { getEmployerGoogleClient } = require("../../../../utils/googleCalendar");
      const mockAuth = { on: jest.fn() };
      (getEmployerGoogleClient as jest.Mock).mockReturnValue(mockAuth);

      (interviewRepository.findById as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        googleCalendarEventId: "gcal-event-1",
      });
      (googleCalendarService.deleteEvent as jest.Mock).mockResolvedValue(undefined);
      (interviewRepository.update as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "CANCELLED",
      });

      await interviewService.cancel(INTERVIEW_ID, EMPLOYER_USER_ID);

      expect(googleCalendarService.deleteEvent).toHaveBeenCalledWith(mockAuth, "gcal-event-1");
    });

    it("should throw 404 if interview not found", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        interviewService.cancel(INTERVIEW_ID, EMPLOYER_USER_ID)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── saveEmailBody ──────────────────────────────────────────────────────────

  describe("saveEmailBody", () => {
    it("should save custom email body to interview", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(mockRawInterview);
      (interviewRepository.update as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        emailBody: "Custom email body",
      });

      const result = await interviewService.saveEmailBody(
        INTERVIEW_ID,
        EMPLOYER_USER_ID,
        "Custom email body"
      );

      expect(interviewRepository.update).toHaveBeenCalledWith(
        INTERVIEW_ID,
        EMPLOYER_PROFILE_ID,
        { emailBody: "Custom email body" }
      );
      expect(result.emailBody).toBe("Custom email body");
    });

    it("should throw 404 if interview not found", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        interviewService.saveEmailBody(INTERVIEW_ID, EMPLOYER_USER_ID, "body")
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── generateCancelEmailPreview ─────────────────────────────────────────────

  describe("generateCancelEmailPreview", () => {
    it("should return subject and body for cancellation preview", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(mockRawInterview);

      const result = await interviewService.generateCancelEmailPreview(
        INTERVIEW_ID,
        EMPLOYER_USER_ID,
        "Scheduling conflict"
      );

      expect(result.subject).toContain("Interview Cancellation");
      expect(result.body).toContain("Scheduling conflict");
      expect(result.body).toContain("Jane Doe");
    });

    it("should throw 404 if interview not found", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        interviewService.generateCancelEmailPreview(INTERVIEW_ID, EMPLOYER_USER_ID, "reason")
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ── cancelAndSendEmail ─────────────────────────────────────────────────────

  describe("cancelAndSendEmail", () => {
    it("should cancel a SCHEDULED interview and send cancellation email", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "SCHEDULED",
      });
      (sendInterviewEmail as jest.Mock).mockResolvedValue(undefined);
      (interviewRepository.update as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "CANCELLED",
      });

      const result = await interviewService.cancelAndSendEmail(
        INTERVIEW_ID,
        EMPLOYER_USER_ID,
        "Scheduling conflict",
        "We regret to cancel your interview."
      );

      expect(sendInterviewEmail).toHaveBeenCalled();
      expect(result.status).toBe("CANCELLED");
    });

    it("should throw 400 if interview is not SCHEDULED", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(mockRawInterview); // status = DRAFT

      await expect(
        interviewService.cancelAndSendEmail(
          INTERVIEW_ID,
          EMPLOYER_USER_ID,
          "reason",
          "body"
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: "Only scheduled interviews can be cancelled this way",
      });
    });

    it("should throw 404 if interview not found", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        interviewService.cancelAndSendEmail(INTERVIEW_ID, EMPLOYER_USER_ID, "reason", "body")
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("should still cancel even if email delivery fails during cancellation", async () => {
      (interviewRepository.findById as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "SCHEDULED",
      });
      (sendInterviewEmail as jest.Mock).mockRejectedValue(new Error("SMTP timeout"));
      (interviewRepository.update as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "CANCELLED",
      });

      const result = await interviewService.cancelAndSendEmail(
        INTERVIEW_ID,
        EMPLOYER_USER_ID,
        "reason",
        "body"
      );

      expect(sendInterviewEmail).toHaveBeenCalled();
      expect(result.status).toBe("CANCELLED");
    });

    it("should still cancel even if Google Calendar event deletion fails", async () => {
      mockPrismaEmployerProfile({
        googleCalendarConnected: true,
        googleAccessToken: "access-token",
        googleRefreshToken: "refresh-token",
      });
      const { getEmployerGoogleClient } = require("../../../../utils/googleCalendar");
      const mockAuth = { on: jest.fn() };
      (getEmployerGoogleClient as jest.Mock).mockReturnValue(mockAuth);

      (interviewRepository.findById as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "SCHEDULED",
        googleCalendarEventId: "gcal-event-1",
      });
      (sendInterviewEmail as jest.Mock).mockResolvedValue(undefined);
      (googleCalendarService.deleteEvent as jest.Mock).mockRejectedValue(new Error("API error"));
      (interviewRepository.update as jest.Mock).mockResolvedValue({
        ...mockRawInterview,
        status: "CANCELLED",
      });

      const result = await interviewService.cancelAndSendEmail(
        INTERVIEW_ID,
        EMPLOYER_USER_ID,
        "reason",
        "body"
      );

      expect(result.status).toBe("CANCELLED");
    });
  });
});