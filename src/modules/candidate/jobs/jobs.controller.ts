import { Request, Response } from "express";
import { jobsService } from "./jobs.service";

export const getJobs = async (req: Request, res: Response) => {
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

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await jobsService.getJobsByRole(role, page, limit);
    res.status(200).json(result);

  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

export const getNewJobs = async (req: Request, res: Response) => {
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

    const result = await jobsService.getNewJobsByRole(role);
    res.status(200).json(result);

  } catch (error) {
    console.error("Error fetching new jobs:", error);
    res.status(500).json({ message: "Failed to fetch new jobs" });
  }
};