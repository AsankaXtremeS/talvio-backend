"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNewJobs = exports.getJobs = void 0;
const jobs_service_1 = require("./jobs.service");
const getJobs = async (req, res) => {
    try {
        const role = req.user?.role;
        if (!role) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        if (role !== "STUDENT" && role !== "PROFESSIONAL") {
            res.status(403).json({ message: "Access denied" });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await jobs_service_1.jobsService.getJobsByRole(role, page, limit);
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error fetching jobs:", error);
        res.status(500).json({ message: "Failed to fetch jobs" });
    }
};
exports.getJobs = getJobs;
const getNewJobs = async (req, res) => {
    try {
        const role = req.user?.role;
        if (!role) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }
        if (role !== "STUDENT" && role !== "PROFESSIONAL") {
            res.status(403).json({ message: "Access denied" });
            return;
        }
        const result = await jobs_service_1.jobsService.getNewJobsByRole(role);
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error fetching new jobs:", error);
        res.status(500).json({ message: "Failed to fetch new jobs" });
    }
};
exports.getNewJobs = getNewJobs;
//# sourceMappingURL=jobs.controller.js.map