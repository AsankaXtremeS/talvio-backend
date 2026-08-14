import { Request, Response } from "express";
import { dashboardService } from "./dashboard.service";

export const getDashboardOverview = async (_req: Request, res: Response) => {
  try {
    const overview = await dashboardService.getOverview();
    res.json(overview);
  } catch (err: any) {
    console.error("getDashboardOverview error:", err);
    res.status(500).json({ message: "Failed to fetch dashboard overview." });
  }
};
