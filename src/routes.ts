import { Express } from "express"
import authRoutes from "./modules/auth/auth.routes"
import adminCompaniesRoutes from "./modules/admin/companies/companies.routes";
import adminCandidatesRoutes from "./modules/admin/candidates/candidates.routes";
import adminDashboardRoutes from "./modules/admin/dashboard/dashboard.routes";
import adminJobPostsRoutes from "./modules/admin/jobposts/jobpost.routes";
import employerJobPostsRoutes from "./modules/employer/jobPosts/jobPosts.routes";
import employerInterviewsRoutes from "./modules/employer/interviews/interview.routes";
import candidateJobsRoutes from "./modules/candidate/jobs/jobs.routes";
import employerProfileRoutes from "./modules/employer/profile/profile.routes";
import { microsoftCalendarCallback } from "./modules/employer/profile/profile.controller";
import candidateApplicationsRoutes from "./modules/candidate/applications/applications.routes";
import candidateProfileRoutes from "./modules/candidate/profile/profile.routes";
import candidateInterviewsRoutes from "./modules/candidate/interviews/interviews.routes";
import aiRoutes from "./modules/ai/ai.routes";


export const registerRoutes = (app: Express) => {
  // ─── Public OAuth Callback (no auth middleware) ──────────────────────────────
  // Microsoft redirects the browser here after the consent screen.
  // This route must be public and registered BEFORE the authenticated routes.
  app.get("/api/v1/calendar/microsoft/callback", microsoftCalendarCallback);

  app.use("/api/auth", authRoutes)
  app.use("/api/admin/companies", adminCompaniesRoutes)
  app.use("/api/admin/candidates", adminCandidatesRoutes);
  app.use("/api/admin/dashboard", adminDashboardRoutes);
  app.use("/api/admin/job-posts", adminJobPostsRoutes);
  app.use("/api/employer/job-posts", employerJobPostsRoutes);
  app.use("/api/employer/interviews", employerInterviewsRoutes);
  app.use("/api/candidate/jobs", candidateJobsRoutes);
  app.use("/api/employer/profile", employerProfileRoutes);
  app.use("/api/candidate/applications", candidateApplicationsRoutes);
  app.use("/api/candidate/profile", candidateProfileRoutes);
  app.use("/api/candidate/interviews", candidateInterviewsRoutes);
  app.use("/api/ai", aiRoutes);
}