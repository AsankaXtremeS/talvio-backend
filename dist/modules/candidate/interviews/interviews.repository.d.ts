type InterviewStatusValue = "DRAFT" | "SCHEDULED" | "CANCELLED" | "COMPLETED";
export declare const candidateInterviewsRepository: {
    findByCandidate(candidateProfileId: string, options: {
        status?: InterviewStatusValue;
        page: number;
        limit: number;
    }): Promise<{
        total: any;
        interviews: any;
    }>;
    findOneByCandidate(candidateProfileId: string, interviewId: string): Promise<any>;
    getScheduledDates(candidateProfileId: string, year: number, month: number): Promise<unknown[]>;
};
export {};
//# sourceMappingURL=interviews.repository.d.ts.map