"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteJobPost = exports.getJobPostById = exports.getJobPosts = exports.getJobPostStats = void 0;
const jobpost_service_1 = require("./jobpost.service");
const resolveStatusCode = (err) => {
    if (typeof err === "object" && err !== null && "statusCode" in err) {
        const candidate = err.statusCode;
        if (typeof candidate === "number")
            return candidate;
    }
    return 500;
};
const getParamAsString = (value) => Array.isArray(value) ? value[0] : value ?? "";
// GET /api/admin/job-posts/stats
const getJobPostStats = async (_req, res) => {
    try {
        const result = await jobpost_service_1.jobpostService.getStats();
        res.json(result);
    }
    catch (err) {
        console.error("getJobPostStats error:", err);
        res.status(resolveStatusCode(err)).json({ message: "Failed to fetch job post stats." });
    }
};
exports.getJobPostStats = getJobPostStats;
// GET /api/admin/job-posts
// Query: ?search=, ?page=, ?limit=
const getJobPosts = async (req, res) => {
    try {
        const search = typeof req.query.search === "string" ? req.query.search : undefined;
        const page = parseInt(String(req.query.page || "1"), 10);
        const limit = parseInt(String(req.query.limit || "20"), 10);
        const result = await jobpost_service_1.jobpostService.getJobPosts({
            search,
            page: Number.isNaN(page) ? 1 : page,
            limit: Number.isNaN(limit) ? 20 : limit,
        });
        res.json(result);
    }
    catch (err) {
        console.error("getJobPosts error:", err);
        res.status(resolveStatusCode(err)).json({ message: "Failed to fetch job posts." });
    }
};
exports.getJobPosts = getJobPosts;
// GET /api/admin/job-posts/:id
const getJobPostById = async (req, res) => {
    try {
        const id = getParamAsString(req.params.id);
        const post = await jobpost_service_1.jobpostService.getJobPostById(id);
        res.json(post);
    }
    catch (err) {
        console.error("getJobPostById error:", err);
        const message = typeof err === "object" && err !== null && "message" in err && typeof err.message === "string"
            ? err.message
            : "Failed to fetch job post.";
        res.status(resolveStatusCode(err)).json({ message });
    }
};
exports.getJobPostById = getJobPostById;
// DELETE /api/admin/job-posts/:id
const deleteJobPost = async (req, res) => {
    try {
        const id = getParamAsString(req.params.id);
        await jobpost_service_1.jobpostService.deleteJobPost(id);
        res.json({ message: "Job post removed successfully." });
    }
    catch (err) {
        console.error("deleteJobPost error:", err);
        const message = typeof err === "object" && err !== null && "message" in err && typeof err.message === "string"
            ? err.message
            : "Failed to remove job post.";
        res.status(resolveStatusCode(err)).json({ message });
    }
};
exports.deleteJobPost = deleteJobPost;
//# sourceMappingURL=jobpost.controller.js.map