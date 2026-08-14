import { Prisma } from "@prisma/client";
import { prisma } from "../../../config/db";

export interface GetAdminJobPostsOptions {
	search?: string;
	page?: number;
	limit?: number;
}

const adminJobPostSelect = Prisma.validator<Prisma.JobPostSelect>()({
	id: true,
	title: true,
	type: true,
	status: true,
	employmentType: true,
	closingDate: true,
	createdAt: true,
	description: true,
	_count: {
		select: {
			applications: true,
		},
	},
	employer: {
		select: {
			companyName: true,
			companyLogoUrl: true,
			user: {
				select: {
					email: true,
				},
			},
		},
	},
});

export type AdminJobPostRecord = Prisma.JobPostGetPayload<{
	select: typeof adminJobPostSelect;
}>;

export const jobpostRepository = {
	async getStats() {
		const [internshipPosts, jobPosts, internshipCompanyRows, jobCompanyRows] = await Promise.all([
			prisma.jobPost.count({ where: { type: "INTERNSHIP" } }),
			prisma.jobPost.count({ where: { type: "JOB" } }),
			prisma.jobPost.findMany({
				where: { type: "INTERNSHIP" },
				distinct: ["employerId"],
				select: { employerId: true },
			}),
			prisma.jobPost.findMany({
				where: { type: "JOB" },
				distinct: ["employerId"],
				select: { employerId: true },
			}),
		]);

		return {
			internshipPosts,
			internshipCompanies: internshipCompanyRows.length,
			jobPosts,
			jobCompanies: jobCompanyRows.length,
		};
	},

	async findAll(options: GetAdminJobPostsOptions = {}) {
		const { search, page = 1, limit = 20 } = options;
		const skip = (page - 1) * limit;

		const where: Prisma.JobPostWhereInput = search
			? {
					OR: [
						{ title: { contains: search, mode: "insensitive" } },
						{
							employer: {
								companyName: { contains: search, mode: "insensitive" },
							},
						},
						{
							employer: {
								user: {
									email: { contains: search, mode: "insensitive" },
								},
							},
						},
					],
				}
			: {};

		const [total, posts] = await Promise.all([
			prisma.jobPost.count({ where }),
			prisma.jobPost.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip,
				take: limit,
				select: adminJobPostSelect,
			}),
		]);

		return { posts, total };
	},

	async findById(id: string) {
		return prisma.jobPost.findUnique({
			where: { id },
			select: adminJobPostSelect,
		});
	},

	async deleteById(id: string) {
		return prisma.jobPost.delete({ where: { id } });
	},

	async existsById(id: string): Promise<boolean> {
		const item = await prisma.jobPost.findUnique({
			where: { id },
			select: { id: true },
		});

		return item !== null;
	},
};
