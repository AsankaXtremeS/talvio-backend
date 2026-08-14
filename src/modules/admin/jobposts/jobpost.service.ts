import { AdminJobPostRecord, GetAdminJobPostsOptions, jobpostRepository } from "./jobpost.repository";

const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;

interface ServiceError extends Error {
	statusCode?: number;
}

const buildHttpError = (message: string, statusCode: number): ServiceError => {
	const err: ServiceError = new Error(message);
	err.statusCode = statusCode;
	return err;
};

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
	companyLogoUrl?: string | null;
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

const logoPalette = [
	"#1D4ED8",
	"#0EA5E9",
	"#0891B2",
	"#0F766E",
	"#059669",
	"#7C3AED",
	"#9333EA",
	"#C026D3",
	"#EA580C",
	"#DC2626",
];

const toInitials = (name: string): string => {
	const parts = name
		.trim()
		.split(/\s+/)
		.filter(Boolean);

	if (parts.length === 0) return "CO";
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const colorFromText = (text: string): string => {
	if (!text) return logoPalette[0];

	const hash = text
		.split("")
		.reduce((sum, char) => sum + char.charCodeAt(0), 0);

	return logoPalette[hash % logoPalette.length];
};

const toCategory = (post: AdminJobPostRecord): string => {
	if (post.employmentType === "FULL_TIME") return "Full-time";
	if (post.employmentType === "PART_TIME") return "Part-time";
	if (post.employmentType === "CONTRACT") return "Contract";
	return post.type === "INTERNSHIP" ? "Internship" : "Job";
};

const toDTO = (post: AdminJobPostRecord): AdminJobPostDTO => {
	const companyName = post.employer.companyName || "Unknown Company";

	return {
		id: post.id,
		companyName,
		companyEmail: post.employer.user.email,
		companyLogoUrl: post.employer.companyLogoUrl ?? null,
		companyLogoColor: colorFromText(companyName),
		companyLogoText: toInitials(companyName),
		category: toCategory(post),
		jobTitle: post.title,
		type: post.type === "INTERNSHIP" ? "Internship" : "Job",
		closedDate: post.closingDate ? post.closingDate.toISOString() : undefined,
		isClosed: post.status === "CLOSED",
		closedApplications: post._count.applications,
		description: post.description || undefined,
	};
};

export const jobpostService = {
	async getStats(): Promise<AdminJobPostStatsDTO> {
		return jobpostRepository.getStats();
	},

	async getJobPosts(options: GetAdminJobPostsOptions): Promise<AdminJobPostListResponse> {
		const page = Math.max(1, options.page ?? 1);
		const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, options.limit ?? DEFAULT_PAGE_LIMIT));
		const search = options.search?.trim() || undefined;

		const { posts, total } = await jobpostRepository.findAll({
			search,
			page,
			limit,
		});

		return {
			data: posts.map(toDTO),
			pagination: {
				total,
				page,
				limit,
				totalPages: Math.ceil(total / limit),
			},
		};
	},

	async getJobPostById(postId: string): Promise<AdminJobPostDTO> {
		const post = await jobpostRepository.findById(postId);

		if (!post) {
			throw buildHttpError("Job post not found", 404);
		}

		return toDTO(post);
	},

	async deleteJobPost(postId: string): Promise<void> {
		const exists = await jobpostRepository.existsById(postId);

		if (!exists) {
			throw buildHttpError("Job post not found", 404);
		}

		await jobpostRepository.deleteById(postId);
	},
};
