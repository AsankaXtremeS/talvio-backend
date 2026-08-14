import { GetAdminJobPostsOptions } from "./jobpost.repository";
export interface AdminJobPostStatsDTO {
    internshipPosts: number;
    internshipCompanies: number;
    jobPosts: number;
    jobCompanies: number;
}
export interface AdminJobPostDTO {
    id: string;
    companyName: string;
    companyEmail: string;
    companyLogoColor: string;
    companyLogoText: string;
    category: string;
    jobTitle: string;
    type: "Job" | "Internship";
    closedDate?: string;
    isClosed: boolean;
    closedApplications: number;
    description?: string;
}
export interface AdminJobPostListResponse {
    data: AdminJobPostDTO[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export declare const jobpostService: {
    getStats(): Promise<AdminJobPostStatsDTO>;
    getJobPosts(options: GetAdminJobPostsOptions): Promise<AdminJobPostListResponse>;
    getJobPostById(postId: string): Promise<AdminJobPostDTO>;
    deleteJobPost(postId: string): Promise<void>;
};
//# sourceMappingURL=jobpost.service.d.ts.map