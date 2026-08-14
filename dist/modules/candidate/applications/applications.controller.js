"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApplicationDetail = exports.getStats = exports.withdrawApplication = exports.applyForJob = exports.getApplicationWithHistory = exports.getApplications = void 0;
const applications_service_1 = require("./applications.service");
const getApplications = async (req, res) => {
    try {
        const userId = req.user?.id;
        const role = req.user?.role;
        if (!userId || !role) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        // Ensure user is a candidate
        if (role !== "STUDENT" && role !== "PROFESSIONAL") {
            res.status(403).json({ message: "Access denied. Only candidates can view applications." });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const result = await applications_service_1.applicationsService.getCandidateApplications(userId, page, limit);
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error fetching candidate applications:", error);
        res.status(500).json({ message: "Failed to fetch applications" });
    }
};
exports.getApplications = getApplications;
const getApplicationWithHistory = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        let { applicationId } = req.params;
        if (!applicationId)
            return res.status(400).json({ message: "Missing applicationId" });
        if (Array.isArray(applicationId))
            applicationId = applicationId[0];
        const application = await applications_service_1.applicationsService.getCandidateApplicationWithHistory(userId, applicationId);
        res.status(200).json({ application });
    }
    catch (error) {
        console.error("Error fetching application with history:", error);
        res.status(500).json({ message: error.message || "Failed to fetch application" });
    }
};
exports.getApplicationWithHistory = getApplicationWithHistory;
const applyForJob = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        let { jobPostId } = req.params;
        if (!jobPostId)
            return res.status(400).json({ message: "Missing jobPostId" });
        if (Array.isArray(jobPostId))
            jobPostId = jobPostId[0];
        const { cvUrl, cvFileName, coverLetter, useDefaultCv } = req.body;
        const application = await applications_service_1.applicationsService.applyToJob(userId, jobPostId, {
            cvUrl,
            cvFileName,
            coverLetter,
            useDefaultCv,
        });
        res.status(201).json({
            message: "Applied successfully",
            application,
        });
    }
    catch (error) {
        console.error("Error applying for job:", error);
        res.status(error.message === "Already applied to this job" ? 400 : 500).json({
            message: error.message || "Failed to apply for job",
        });
    }
};
exports.applyForJob = applyForJob;
const withdrawApplication = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        let { applicationId } = req.params;
        if (!applicationId)
            return res.status(400).json({ message: "Missing applicationId" });
        if (Array.isArray(applicationId))
            applicationId = applicationId[0];
        await applications_service_1.applicationsService.withdrawApplication(userId, applicationId);
        res.status(200).json({
            message: "Application withdrawn successfully",
        });
    }
    catch (error) {
        console.error("Error withdrawing application:", error);
        res.status(500).json({
            message: error.message || "Failed to withdraw application",
        });
    }
};
exports.withdrawApplication = withdrawApplication;
const getStats = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        const stats = await applications_service_1.applicationsService.getCandidateStats(userId);
        res.status(200).json(stats);
    }
    catch (error) {
        console.error("Error fetching candidate stats:", error);
        res.status(500).json({
            message: error.message || "Failed to fetch dashboard stats",
        });
    }
};
exports.getStats = getStats;
const getApplicationDetail = async (req, res) => {
    try {
        const { applicationId } = req.params;
        const application = await applications_service_1.applicationsService.getApplicationById(applicationId);
        if (!application)
            return res.status(404).json({ message: "Application not found" });
        res.status(200).json(application);
    }
    catch (error) {
        console.error("Error fetching application detail:", error);
        res.status(500).json({ message: error.message || "Failed to fetch application detail" });
    }
};
exports.getApplicationDetail = getApplicationDetail;
//# sourceMappingURL=applications.controller.js.map