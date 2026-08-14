"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardOverview = void 0;
const dashboard_service_1 = require("./dashboard.service");
const getDashboardOverview = async (_req, res) => {
    try {
        const overview = await dashboard_service_1.dashboardService.getOverview();
        res.json(overview);
    }
    catch (err) {
        console.error("getDashboardOverview error:", err);
        res.status(500).json({ message: "Failed to fetch dashboard overview." });
    }
};
exports.getDashboardOverview = getDashboardOverview;
//# sourceMappingURL=dashboard.controller.js.map