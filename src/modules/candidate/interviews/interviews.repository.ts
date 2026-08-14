import { prisma } from "../../../config/db";

type InterviewStatusValue = "DRAFT" | "SCHEDULED" | "CANCELLED" | "COMPLETED";
const prismaAny = prisma as any;

const interviewSelect = {
  id: true,
  status: true,
  scheduledAt: true,
  meetingType: true,
  location: true,
  meetingLink: true,
  googleCalendarLink: true,
  additionalInfo: true,
  cancelledAt: true,
  cancellationReason: true,
  createdAt: true,
  updatedAt: true,
  rescheduledFromId: true,
  rescheduledToId: true,
  employer: {
    select: {
      companyName: true,
      companyLocation: true,
      companyDescription: true,
      companyWebsite: true,
      companyLogoUrl: true,
    },
  },
  jobPost: {
    select: {
      id: true,
      title: true,
      type: true,
      workMode: true,
      employmentType: true,
      stipendType: true,
      duration: true,
      location: true,
      description: true,
      responsibilities: true,
    },
  },
} as const;

export const candidateInterviewsRepository = {
  async findByCandidate(
    candidateProfileId: string,
    options: { status?: InterviewStatusValue; page: number; limit: number }
  ) {
    const skip = (options.page - 1) * options.limit;

    const where = {
      candidateProfileId,
      ...(options.status ? { status: options.status } : {}),
    };

    const [total, interviews] = await Promise.all([
      prismaAny.interview.count({ where }),
      prismaAny.interview.findMany({
        where,
        select: interviewSelect,
        orderBy: { scheduledAt: "asc" },
        skip,
        take: options.limit,
      }),
    ]);

    return { total, interviews };
  },

  async findOneByCandidate(candidateProfileId: string, interviewId: string) {
    return prismaAny.interview.findFirst({
      where: {
        id: interviewId,
        candidateProfileId,
      },
      select: interviewSelect,
    });
  },

  async getScheduledDates(candidateProfileId: string, year: number, month: number) {
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const interviews = await prismaAny.interview.findMany({
      where: {
        candidateProfileId,
        status: "SCHEDULED",
        scheduledAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: { scheduledAt: true },
    });

    return Array.from(
      new Set(interviews.map((item: { scheduledAt: Date }) => item.scheduledAt.toISOString().split("T")[0]))
    );
  },
};
