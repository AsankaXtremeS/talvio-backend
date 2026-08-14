"use strict";
// Controller layer for employer profile management.
//
// A controller's ONLY job is HTTP: read the request, call the service,
// send the response. No business logic or DB queries belong here.
//
// Error handling pattern (same as jobPosts.controller.ts):
//   Services throw errors with a statusCode property for known cases (403, 404).
//   resolveStatusCode() reads that to set the right HTTP status.
//   Anything without a statusCode falls back to 500.
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectCalendar = exports.connectCalendar = exports.getCalendarAuthUrl = exports.updateProfile = exports.getProfile = void 0;
const profile_service_1 = require("./profile.service");
const profile_validation_1 = require("./profile.validation");
// ─── Helpers ──────────────────────────────────────────────────────────────────
const resolveStatusCode = (err) => {
    if (isDbUnavailableError(err))
        return 503;
    if (typeof err?.statusCode === "number")
        return err.statusCode;
    return 500;
};
const isDbUnavailableError = (err) => {
    const message = typeof err?.message === "string" ? err.message.toLowerCase() : "";
    const name = typeof err?.name === "string" ? err.name : "";
    return (name === "PrismaClientInitializationError" ||
        name === "PrismaClientKnownRequestError" ||
        message.includes("can't reach database server") ||
        message.includes("database") ||
        message.includes("p1001"));
};
const getPublicErrorMessage = (err, fallback) => {
    if (isDbUnavailableError(err)) {
        return "Service temporarily unavailable. Please try again in a moment.";
    }
    if (typeof err?.message === "string" && err.message.trim()) {
        return err.message;
    }
    return fallback;
};
const logControllerError = (scope, err) => {
    if (isDbUnavailableError(err)) {
        console.error(`${scope} error: database unavailable`);
        return;
    }
    console.error(`${scope} error:`, err);
};
// userId always comes from the verified JWT payload set by the authenticate
// middleware — never from req.body or req.params. This is the key IDOR guard.
const getUserId = (req) => {
    return req.user?.id ?? req.user?.userId ?? null;
};
// ─── GET /api/employer/profile ────────────────────────────────────────────────
//
// Returns the authenticated employer's own profile.
//
// Response: EmployerProfileDTO
// Errors:   401 if not authenticated | 404 if profile missing
//
// Available to PENDING and REJECTED employers too (they need to read their
// profile and rejection reason without being able to change anything).
const getProfile = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        const profile = await profile_service_1.profileService.getProfile(userId);
        res.json(profile);
    }
    catch (err) {
        logControllerError("getProfile", err);
        res.status(resolveStatusCode(err)).json({
            message: getPublicErrorMessage(err, "Failed to fetch profile."),
        });
    }
};
exports.getProfile = getProfile;
// ─── PATCH /api/employer/profile ─────────────────────────────────────────────
//
// Partially updates the authenticated employer's own profile.
// Only whitelisted fields (companyName, description, website, location,
// companyLogoUrl) can be changed. Status, registration docs, and IDs
// are immutable from this endpoint.
//
// Request body: any subset of the whitelisted fields (all optional)
// Response: updated EmployerProfileDTO
// Errors:   400 validation | 401 unauthorized | 403 not approved | 404 no profile
const updateProfile = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        // Validate input with Zod — unknown fields are stripped automatically
        const parseResult = profile_validation_1.updateProfileSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: parseResult.error.flatten().fieldErrors,
            });
        }
        const updated = await profile_service_1.profileService.updateProfile(userId, parseResult.data);
        res.json(updated);
    }
    catch (err) {
        logControllerError("updateProfile", err);
        res.status(resolveStatusCode(err)).json({
            message: getPublicErrorMessage(err, "Failed to update profile."),
        });
    }
};
exports.updateProfile = updateProfile;
// ─── GET /api/employer/profile/calendar/auth-url ─────────────────────────────
//
// Generates the Google OAuth2 consent URL for the employer.
// Response: { url: string }
const getCalendarAuthUrl = async (req, res) => {
    try {
        const url = await profile_service_1.profileService.getCalendarAuthUrl();
        res.json({ url });
    }
    catch (err) {
        logControllerError("getCalendarAuthUrl", err);
        res.status(resolveStatusCode(err)).json({
            message: getPublicErrorMessage(err, "Failed to generate auth URL."),
        });
    }
};
exports.getCalendarAuthUrl = getCalendarAuthUrl;
// ─── POST /api/employer/profile/calendar/connect ─────────────────────────────
//
// Exchanges the Google OAuth code for tokens and saves them.
// Request body: { code: string }
// Response: EmployerProfileDTO
const connectCalendar = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        const { code } = req.body;
        if (!code)
            return res.status(400).json({ message: "Auth code is required" });
        const profile = await profile_service_1.profileService.connectCalendar(userId, code);
        res.json(profile);
    }
    catch (err) {
        logControllerError("connectCalendar", err);
        res.status(resolveStatusCode(err)).json({
            message: getPublicErrorMessage(err, "Failed to connect calendar."),
        });
    }
};
exports.connectCalendar = connectCalendar;
// ─── POST /api/employer/profile/calendar/disconnect ──────────────────────────
//
// Removes Google tokens and disconnects the calendar.
// Response: EmployerProfileDTO
const disconnectCalendar = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        const profile = await profile_service_1.profileService.disconnectCalendar(userId);
        res.json(profile);
    }
    catch (err) {
        logControllerError("disconnectCalendar", err);
        res.status(resolveStatusCode(err)).json({
            message: getPublicErrorMessage(err, "Failed to disconnect calendar."),
        });
    }
};
exports.disconnectCalendar = disconnectCalendar;
//# sourceMappingURL=profile.controller.js.map