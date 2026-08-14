import { GetCandidatesOptions } from "./candidates.repository";
export interface CandidateDTO {
    id: string;
    firstName: string | null;
    lastName: string | null;
    fullName: string;
    email: string;
    role: string;
    isVerified: boolean;
    joinedAt: string;
    authProvider: string;
}
export interface CandidateListResponse {
    data: CandidateDTO[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export interface CandidateStatsDTO {
    lookingForInternships: number;
    lookingForJobs: number;
    internshipApplyingRate: number;
    internshipHiringRate: number;
    jobApplyingRate: number;
    jobHiringRate: number;
}
export declare const candidatesService: {
    getCandidateStats(): Promise<CandidateStatsDTO>;
    getCandidates(options: GetCandidatesOptions): Promise<CandidateListResponse>;
    getCandidateById(userId: string): Promise<CandidateDTO>;
    deleteCandidate(userId: string): Promise<void>;
};
//# sourceMappingURL=candidates.service.d.ts.map