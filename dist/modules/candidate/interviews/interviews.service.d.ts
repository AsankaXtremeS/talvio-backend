type InterviewStatusValue = "DRAFT" | "SCHEDULED" | "CANCELLED" | "COMPLETED";
type ListOptions = {
    page: number;
    limit: number;
    status?: InterviewStatusValue;
};
export declare const candidateInterviewsService: {
    listByCandidate(userId: string, options: ListOptions): Promise<{
        data: any;
        pagination: {
            total: any;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getById(userId: string, interviewId: string): Promise<{
        id: any;
        status: any;
        scheduledAt: any;
        meetingType: any;
        location: any;
        meetingLink: any;
        googleCalendarLink: any;
        additionalInfo: any;
        cancelledAt: any;
        cancellationReason: any;
        rescheduledFromId: any;
        rescheduledToId: any;
        createdAt: any;
        updatedAt: any;
        company: {
            name: any;
            location: any;
            description: any;
            website: any;
            logoUrl: any;
        };
        jobPost: {
            id: any;
            title: any;
            type: any;
            workMode: any;
            employmentType: any;
            stipendType: any;
            duration: any;
            location: any;
            description: any;
            responsibilities: any;
        };
    }>;
    getScheduledDates(userId: string, year: number, month: number): Promise<unknown[]>;
};
export {};
//# sourceMappingURL=interviews.service.d.ts.map