import { JobPostQueryInput, CreateJobPostInput, UpdateJobPostInput } from "./jobPosts.validation";
interface JobPostDTO {
    id: string;
    title: string;
    type: "Job" | "Internship";
    status: "Draft" | "Active" | "Closed";
    applicantsCount: number;
    description: string;
    responsibilities: string;
    requirements: string;
    additionalInformation: string;
    skills: string;
    workMode: "On site" | "Remote" | "Hybrid";
    employmentType: "Full-time" | "Part-time" | "Contract";
    closingDate: string;
    location: string;
    company: {
        name: string;
        logoUrl?: string | null;
    };
    createdAt?: string;
    updatedAt?: string;
}
interface JobPostListResponse {
    data: JobPostDTO[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}
export declare const jobsService: {
    getStats(userId: string): Promise<{
        total: number;
        active: number;
        draft: number;
        closed: number;
        applications: number;
    }>;
    getJobPosts(userId: string, query: JobPostQueryInput): Promise<JobPostListResponse>;
    getJobPostById(userId: string, postId: string): Promise<JobPostDTO>;
    createJobPost(userId: string, data: CreateJobPostInput): Promise<JobPostDTO>;
    updateJobPost(userId: string, postId: string, data: UpdateJobPostInput): Promise<JobPostDTO>;
    deleteJobPost(userId: string, postId: string): Promise<void>;
    getApplicationsByJobPost(userId: string, jobPostId: string, status?: string): Promise<any[]>;
};
export {};
//# sourceMappingURL=jobPosts.service.d.ts.map