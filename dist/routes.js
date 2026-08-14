"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = void 0;
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const companies_routes_1 = __importDefault(require("./modules/admin/companies/companies.routes"));
const candidates_routes_1 = __importDefault(require("./modules/admin/candidates/candidates.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/admin/dashboard/dashboard.routes"));
const jobpost_routes_1 = __importDefault(require("./modules/admin/jobposts/jobpost.routes"));
const jobPosts_routes_1 = __importDefault(require("./modules/employer/jobPosts/jobPosts.routes"));
const interview_routes_1 = __importDefault(require("./modules/employer/interviews/interview.routes"));
const jobs_routes_1 = __importDefault(require("./modules/candidate/jobs/jobs.routes"));
const profile_routes_1 = __importDefault(require("./modules/employer/profile/profile.routes"));
const applications_routes_1 = __importDefault(require("./modules/candidate/applications/applications.routes"));
const profile_routes_2 = __importDefault(require("./modules/candidate/profile/profile.routes"));
const interviews_routes_1 = __importDefault(require("./modules/candidate/interviews/interviews.routes"));
const ai_routes_1 = __importDefault(require("./modules/ai/ai.routes"));
const registerRoutes = (app) => {
    app.use("/api/auth", auth_routes_1.default);
    app.use("/api/admin/companies", companies_routes_1.default);
    app.use("/api/admin/candidates", candidates_routes_1.default);
    app.use("/api/admin/dashboard", dashboard_routes_1.default);
    app.use("/api/admin/job-posts", jobpost_routes_1.default);
    app.use("/api/employer/job-posts", jobPosts_routes_1.default);
    app.use("/api/employer/interviews", interview_routes_1.default);
    app.use("/api/candidate/jobs", jobs_routes_1.default);
    app.use("/api/employer/profile", profile_routes_1.default);
    app.use("/api/employer/profile", profile_routes_1.default);
    app.use("/api/candidate/applications", applications_routes_1.default);
    app.use("/api/candidate/profile", profile_routes_2.default);
    app.use("/api/candidate/interviews", interviews_routes_1.default);
    app.use("/api/ai", ai_routes_1.default);
};
exports.registerRoutes = registerRoutes;
//# sourceMappingURL=routes.js.map