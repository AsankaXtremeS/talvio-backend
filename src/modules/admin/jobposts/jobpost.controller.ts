import { Request, Response } from "express";
import { jobpostService } from "./jobpost.service";

const resolveStatusCode = (err: unknown): number => {
	if (typeof err === "object" && err !== null && "statusCode" in err) {
		const candidate = (err as { statusCode?: unknown }).statusCode;
		if (typeof candidate === "number") return candidate;
	}

	return 500;
};

const getParamAsString = (value: string | string[] | undefined): string =>
	Array.isArray(value) ? value[0] : value ?? "";

// GET /api/admin/job-posts/stats
export const getJobPostStats = async (_req: Request, res: Response) => {
	try {
		const result = await jobpostService.getStats();
		res.json(result);
	} catch (err: unknown) {
		console.error("getJobPostStats error:", err);
		res.status(resolveStatusCode(err)).json({ message: "Failed to fetch job post stats." });
	}
};

// GET /api/admin/job-posts
// Query: ?search=, ?page=, ?limit=
export const getJobPosts = async (req: Request, res: Response) => {
	try {
		const search = typeof req.query.search === "string" ? req.query.search : undefined;
		const page = parseInt(String(req.query.page || "1"), 10);
		const limit = parseInt(String(req.query.limit || "20"), 10);

		const result = await jobpostService.getJobPosts({
			search,
			page: Number.isNaN(page) ? 1 : page,
			limit: Number.isNaN(limit) ? 20 : limit,
		});

		res.json(result);
	} catch (err: unknown) {
		console.error("getJobPosts error:", err);
		res.status(resolveStatusCode(err)).json({ message: "Failed to fetch job posts." });
	}
};

// GET /api/admin/job-posts/:id
export const getJobPostById = async (req: Request, res: Response) => {
	try {
		const id = getParamAsString(req.params.id);
		const post = await jobpostService.getJobPostById(id);
		res.json(post);
	} catch (err: unknown) {
		console.error("getJobPostById error:", err);
		const message =
			typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: unknown }).message === "string"
				? (err as { message: string }).message
				: "Failed to fetch job post.";

		res.status(resolveStatusCode(err)).json({ message });
	}
};

// DELETE /api/admin/job-posts/:id
export const deleteJobPost = async (req: Request, res: Response) => {
	try {
		const id = getParamAsString(req.params.id);
		await jobpostService.deleteJobPost(id);
		res.json({ message: "Job post removed successfully." });
	} catch (err: unknown) {
		console.error("deleteJobPost error:", err);
		const message =
			typeof err === "object" && err !== null && "message" in err && typeof (err as { message?: unknown }).message === "string"
				? (err as { message: string }).message
				: "Failed to remove job post.";

		res.status(resolveStatusCode(err)).json({ message });
	}
};
