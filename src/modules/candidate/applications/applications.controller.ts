import { Request, Response } from "express";
import { applicationsService } from "./applications.service";

export const getApplications = async (req: Request, res: Response) => {
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await applicationsService.getCandidateApplications(userId, page, limit);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching candidate applications:", error);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
};

export const getApplicationWithHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let { applicationId } = req.params;
    if (!applicationId) return res.status(400).json({ message: "Missing applicationId" });
    if (Array.isArray(applicationId)) applicationId = applicationId[0];

    const application = await applicationsService.getCandidateApplicationWithHistory(userId, applicationId);
    res.status(200).json({ application });
  } catch (error: any) {
    console.error("Error fetching application with history:", error);
    res.status(500).json({ message: error.message || "Failed to fetch application" });
  }
};

export const applyForJob = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let { jobPostId } = req.params;
    if (!jobPostId) return res.status(400).json({ message: "Missing jobPostId" });
    if (Array.isArray(jobPostId)) jobPostId = jobPostId[0];

  
    const { cvUrl, cvFileName, coverLetter, useDefaultCv } = req.body;

    const application = await applicationsService.applyToJob(userId, jobPostId as string, {
      cvUrl,
      cvFileName,
      coverLetter,
      useDefaultCv,
    });

    res.status(201).json({
      message: "Applied successfully",
      application,
    });
  } catch (error: any) {
    console.error("Error applying for job:", error);
    res.status(error.message === "Already applied to this job" ? 400 : 500).json({
      message: error.message || "Failed to apply for job",
    });
  }
};

export const withdrawApplication = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    let { applicationId } = req.params;
    if (!applicationId) return res.status(400).json({ message: "Missing applicationId" });
    if (Array.isArray(applicationId)) applicationId = applicationId[0];

    await applicationsService.withdrawApplication(userId, applicationId);

    res.status(200).json({
      message: "Application withdrawn successfully",
    });
  } catch (error: any) {
    console.error("Error withdrawing application:", error);
    res.status(500).json({
      message: error.message || "Failed to withdraw application",
    });
  }
};

export const getStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const stats = await applicationsService.getCandidateStats(userId);
    res.status(200).json(stats);
  } catch (error: any) {
    console.error("Error fetching candidate stats:", error);
    res.status(500).json({
      message: error.message || "Failed to fetch dashboard stats",
    });
  }
};
export const getApplicationDetail = async (req: Request, res: Response) => {
  try {
    let { applicationId } = req.params;
    if (Array.isArray(applicationId)) applicationId = applicationId[0];

    const application = await applicationsService.getApplicationById(applicationId);
    
    if (!application) return res.status(404).json({ message: "Application not found" });

    res.status(200).json(application);
  } catch (error: any) {
    console.error("Error fetching application detail:", error);
    res.status(500).json({ message: error.message || "Failed to fetch application detail" });
  }
};
