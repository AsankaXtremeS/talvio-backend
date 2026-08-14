"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMyRole = exports.me = exports.oauthCallback = exports.oauthStart = exports.getPendingEmployers = exports.getEmployersByStatus = exports.rejectEmployer = exports.approveEmployer = exports.resetPassword = exports.forgotPassword = exports.logout = exports.refresh = exports.login = exports.registerEmployer = exports.registerUser = void 0;
const auth_service_1 = require("./auth.service");
const passport_1 = __importDefault(require("../../config/passport"));
const auth_validation_1 = require("./auth.validation");
const jwt_1 = require("../../utils/jwt");
const getSecureCookieFlag = (req) => {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const isForwardedHttps = typeof forwardedProto === "string"
        ? forwardedProto.includes("https")
        : Array.isArray(forwardedProto)
            ? forwardedProto.some((value) => value.includes("https"))
            : false;
    return req.secure || isForwardedHttps;
};
const buildAuthCookieOptions = (req, maxAge) => {
    const secure = getSecureCookieFlag(req);
    const sameSite = secure ? "none" : "lax";
    return {
        httpOnly: true,
        secure,
        // Browsers reject SameSite=None cookies without Secure=true.
        // In local http dev we use lax; in https/prod we use none.
        sameSite,
        maxAge,
    };
};
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const ACCESS_COOKIE_MAX_AGE = 15 * 60 * 1000;
const DEV_FALLBACK_EMPLOYER_EMAIL = (process.env.DEV_FALLBACK_EMPLOYER_EMAIL || "employer@test.com").trim().toLowerCase();
const DEV_FALLBACK_EMPLOYER_PASSWORD = process.env.DEV_FALLBACK_EMPLOYER_PASSWORD || "Test@1234";
const isDbUnavailableError = (errorName, message) => errorName === "PrismaClientInitializationError" ||
    errorName === "PrismaClientKnownRequestError" ||
    message.toLowerCase().includes("can't reach database server") ||
    message.toLowerCase().includes("database");
const canUseDevFallbackLogin = (req) => {
    if (process.env.NODE_ENV === "production")
        return false;
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");
    return email === DEV_FALLBACK_EMPLOYER_EMAIL && password === DEV_FALLBACK_EMPLOYER_PASSWORD;
};
const sanitizeRegistrationError = (message, fallback) => {
    if (!message)
        return fallback || "Registration failed. Please try again.";
    if (message === "User already exists")
        return "User already exists";
    if (message === "Business registration PDF is required")
        return message;
    return fallback || "Registration failed. Please try again.";
};
// REGISTER STUDENT / PROFESSIONAL
// Public endpoint for registering a new student or professional user.
// Expects: { firstName, lastName, email, password, confirmPassword, role }
// Only allows role: STUDENT or PROFESSIONAL
// Returns: { accessToken, refreshToken } on success
const registerUser = async (req, res) => {
    try {
        (0, auth_validation_1.validateRegisterUser)(req.body);
        await auth_service_1.authService.registerUser(req.body);
        res.status(201).json({ message: "Registration successful. Please log in." });
    }
    catch (err) {
        console.error("registerUser error:", err);
        res.status(400).json({ message: sanitizeRegistrationError(err?.message) });
    }
};
exports.registerUser = registerUser;
// REGISTER EMPLOYER (WITH PDF UPLOAD)
// Public endpoint for registering a new employer user.
// Expects: { email, password, confirmPassword, companyName } and PDF file (registrationFile)
// Returns: { message, userId } on success. Requires admin approval before login.
const registerEmployer = async (req, res) => {
    try {
        const { registrationFileUrl, registrationFileName } = req.body;
        if (!registrationFileUrl) {
            throw new Error("Business registration PDF URL is required");
        }
        (0, auth_validation_1.validateRegisterEmployer)(req.body);
        const result = await auth_service_1.authService.registerEmployer({
            ...req.body,
            registrationFileUrl,
            registrationFileName: registrationFileName || "BusinessRegistration.pdf",
        });
        res.status(201).json(result);
    }
    catch (err) {
        console.error("registerEmployer error:", err);
        res.status(400).json({
            message: sanitizeRegistrationError(err?.message, "Employer registration failed. Please try again."),
        });
    }
};
exports.registerEmployer = registerEmployer;
// LOGIN
// Public endpoint for user login.
// Expects: { email, password }
// Returns: { accessToken, refreshToken } on success
const login = async (req, res) => {
    try {
        (0, auth_validation_1.validateLogin)(req.body);
        const { accessToken, refreshToken, user } = await auth_service_1.authService.login(req.body);
        if (!accessToken || !refreshToken) {
            console.error("Token generation failed: accessToken or refreshToken is missing");
            return res.status(500).json({ message: "Token generation failed" });
        }
        res.cookie("accessToken", accessToken, buildAuthCookieOptions(req, ACCESS_COOKIE_MAX_AGE));
        res.cookie("refreshToken", refreshToken, buildAuthCookieOptions(req, REFRESH_COOKIE_MAX_AGE));
        console.log(`User ${user.id} logged in successfully with role ${user.role}`);
        res.json({ user, accessToken, refreshToken });
    }
    catch (err) {
        console.error("login error:", err);
        const message = typeof err?.message === "string" ? err.message : "Login failed. Please check your credentials.";
        const errorName = typeof err?.name === "string" ? err.name : "";
        if (isDbUnavailableError(errorName, message)) {
            if (canUseDevFallbackLogin(req)) {
                const fallbackUser = {
                    id: "00000000-0000-0000-0000-000000000001",
                    role: "EMPLOYER",
                    email: DEV_FALLBACK_EMPLOYER_EMAIL,
                };
                const accessToken = (0, jwt_1.generateAccessToken)({
                    userId: fallbackUser.id,
                    role: fallbackUser.role,
                });
                const refreshToken = (0, jwt_1.generateRefreshToken)({ userId: fallbackUser.id });
                res.cookie("accessToken", accessToken, buildAuthCookieOptions(req, ACCESS_COOKIE_MAX_AGE));
                res.cookie("refreshToken", refreshToken, buildAuthCookieOptions(req, REFRESH_COOKIE_MAX_AGE));
                return res.json({
                    user: fallbackUser,
                    accessToken,
                    refreshToken,
                    warning: "Logged in with development fallback because database is unavailable.",
                });
            }
            return res.status(503).json({
                code: "AUTH_SERVICE_UNAVAILABLE",
                message: "Login is temporarily unavailable. Please try again in a moment.",
            });
        }
        if (message === "Account pending admin approval") {
            return res.status(403).json({
                code: "EMPLOYER_PENDING_APPROVAL",
                message: "Your employer account is still pending admin approval.",
            });
        }
        if (message.startsWith("Employer account was rejected")) {
            return res.status(403).json({
                code: "EMPLOYER_REJECTED",
                message,
            });
        }
        if (message === "Employer profile missing. Please contact support.") {
            return res.status(403).json({
                code: "EMPLOYER_PROFILE_MISSING",
                message,
            });
        }
        if (message === "Invalid credentials") {
            return res.status(401).json({ message: "Login failed. Please check your credentials." });
        }
        if (message === "Email and password required" || message === "Invalid email format") {
            return res.status(400).json({ message });
        }
        res.status(401).json({ message: "Login failed. Please check your credentials." });
    }
};
exports.login = login;
// REFRESH TOKEN
// Public endpoint to refresh access and refresh tokens.
// Expects: { refreshToken }
// Returns: { accessToken, refreshToken } on success
const refresh = async (req, res) => {
    try {
        const cookieToken = req.cookies?.refreshToken;
        const bodyToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined;
        const token = cookieToken || bodyToken;
        if (!token) {
            return res.status(401).json({ message: "No refresh token" });
        }
        const { accessToken, refreshToken, user } = await auth_service_1.authService.refresh(token);
        res.cookie("accessToken", accessToken, buildAuthCookieOptions(req, ACCESS_COOKIE_MAX_AGE));
        res.cookie("refreshToken", refreshToken, buildAuthCookieOptions(req, REFRESH_COOKIE_MAX_AGE));
        res.json({ user, accessToken, refreshToken });
    }
    catch (err) {
        console.error("refresh error:", err);
        res.status(401).json({ message: "Token refresh failed." });
    }
};
exports.refresh = refresh;
// LOGOUT
// Public endpoint to revoke a refresh token (logout).
// Expects: { refreshToken }
// Returns: { message } on success
const logout = async (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (token)
            await auth_service_1.authService.logout(token);
        const secure = getSecureCookieFlag(req);
        const sameSite = secure ? "none" : "lax";
        const clearCookieOptions = {
            httpOnly: true,
            secure,
            sameSite,
        };
        res.clearCookie("accessToken", clearCookieOptions);
        res.clearCookie("refreshToken", {
            httpOnly: clearCookieOptions.httpOnly,
            secure: clearCookieOptions.secure,
            sameSite: clearCookieOptions.sameSite,
        });
        res.json({ message: 'Logged out successfully' });
    }
    catch (err) {
        console.error("logout error:", err);
        res.status(400).json({ message: "Logout failed." });
    }
};
exports.logout = logout;
// FORGOT PASSWORD
// Public endpoint to request a password reset link.
// Expects: { email }
// Returns: { message } (always generic for security)
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            throw new Error("Email required");
        }
        const result = await auth_service_1.authService.forgotPassword(email);
        res.json(result);
    }
    catch (err) {
        console.error("forgotPassword error:", err);
        res.status(400).json({ message: "Password reset request failed." });
    }
};
exports.forgotPassword = forgotPassword;
// RESET PASSWORD
// Public endpoint to reset password using a reset token.
// Expects: { token, newPassword }
// Returns: { message } on success
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            throw new Error("Token and new password required");
        }
        const result = await auth_service_1.authService.resetPassword(token, newPassword);
        res.json(result);
    }
    catch (err) {
        console.error("resetPassword error:", err);
        res.status(400).json({ message: "Password reset failed." });
    }
};
exports.resetPassword = resetPassword;
// ADMIN APPROVE EMPLOYER
// Admin-only endpoint to approve an employer account.
// Expects: { userId }
// Returns: { message } on success
const approveEmployer = async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            throw new Error("User ID required");
        }
        const result = await auth_service_1.authService.approveEmployer(userId);
        res.json(result);
    }
    catch (err) {
        console.error("approveEmployer error:", err);
        res.status(400).json({ message: "Employer approval failed." });
    }
};
exports.approveEmployer = approveEmployer;
// ADMIN REJECT EMPLOYER
// Admin-only endpoint to reject an employer account.
// Expects: { userId }
// Returns: { message } on success
const rejectEmployer = async (req, res) => {
    try {
        const { userId, reason } = req.body;
        if (!userId)
            throw new Error("User ID required");
        const result = await auth_service_1.authService.rejectEmployer(userId, reason);
        res.json(result);
    }
    catch (err) {
        console.error("rejectEmployer error:", err);
        res.status(400).json({ message: "Employer rejection failed." });
    }
};
exports.rejectEmployer = rejectEmployer;
// ADMIN GET EMPLOYERS BY STATUS
// Admin-only endpoint to list employer registrations by verification status.
// Query: ?status=pending|approved|rejected
// Returns: array of users with employerProfile
const getEmployersByStatus = async (req, res) => {
    try {
        const status = String(req.query.status || "").toLowerCase();
        if (!["pending", "approved", "rejected"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status. Use pending, approved, or rejected.",
            });
        }
        const employers = await auth_service_1.authService.getEmployersByStatus(status);
        res.json(employers);
    }
    catch (err) {
        console.error("getEmployersByStatus error:", err);
        res.status(500).json({ message: "Failed to fetch employers." });
    }
};
exports.getEmployersByStatus = getEmployersByStatus;
// ADMIN GET PENDING EMPLOYERS
// Admin-only endpoint to list all pending employer registrations.
// Returns: array of users with employerProfile
const getPendingEmployers = async (req, res) => {
    try {
        const employers = await auth_service_1.authService.getPendingEmployers();
        res.json(employers);
    }
    catch (err) {
        console.error("getPendingEmployers error:", err);
        res.status(500).json({ message: "Failed to fetch pending employers." });
    }
};
exports.getPendingEmployers = getPendingEmployers;
// OAUTH START
// Public endpoint to initiate OAuth flow with Google or LinkedIn.
// Expects: provider in URL params, role in query (STUDENT or PROFESSIONAL)
// Redirects to provider's authorization URL
const getOAuthProvider = (providerParam) => {
    const rawProvider = Array.isArray(providerParam) ? providerParam[0] : providerParam;
    const provider = String(rawProvider || "").toLowerCase();
    if (provider !== "google" && provider !== "linkedin") {
        throw new Error("Unsupported OAuth provider");
    }
    return provider;
};
const oauthStart = async (req, res, next) => {
    try {
        const provider = getOAuthProvider(req.params.provider);
        const role = String(req.query.role || "").toUpperCase();
        const state = auth_service_1.authService.createOAuthState(provider, role);
        const scope = ["openid", "email", "profile"];
        const authOptions = {
            scope,
            session: false,
            state,
        };
        // Force Google to show account selection instead of silently reusing a signed-in account.
        if (provider === "google") {
            authOptions.prompt = "select_account";
            authOptions.accessType = "offline";
        }
        return passport_1.default.authenticate(provider, authOptions)(req, res, next);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "OAuth initialization failed";
        console.error("oauthStart error:", err);
        return res.status(400).json({ message });
    }
};
exports.oauthStart = oauthStart;
const oauthCallback = async (req, res, next) => {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    try {
        const provider = getOAuthProvider(req.params.provider);
        const state = String(req.query.state || "");
        return passport_1.default.authenticate(provider, { session: false }, async (err, oauthPayload) => {
            if (err || !oauthPayload) {
                const authError = err instanceof Error ? err.message : "OAuth callback failed";
                console.error("oauthCallback passport error:", err);
                return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(authError)}`);
            }
            try {
                const { accessToken, refreshToken } = await auth_service_1.authService.completeOAuthCallback(provider, state, oauthPayload);
                res.cookie("accessToken", accessToken, buildAuthCookieOptions(req, ACCESS_COOKIE_MAX_AGE));
                res.cookie("refreshToken", refreshToken, buildAuthCookieOptions(req, REFRESH_COOKIE_MAX_AGE));
                return res.redirect(`${frontendUrl}/oauth/callback`);
            }
            catch (callbackError) {
                const message = callbackError instanceof Error ? callbackError.message : "OAuth callback failed";
                console.error("oauthCallback error:", callbackError);
                return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
            }
        })(req, res, next);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "OAuth callback failed";
        console.error("oauthCallback error:", err);
        return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
    }
};
exports.oauthCallback = oauthCallback;
// CURRENT SESSION USER
// Protected endpoint for reading the authenticated user's own profile.
// Identity is derived from auth middleware (token/cookie), not URL or request body.
const me = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = await auth_service_1.authService.getCurrentUser(userId);
        return res.json({ user });
    }
    catch (err) {
        console.error("me error:", err);
        return res.status(400).json({ message: err?.message || "Failed to load session user." });
    }
};
exports.me = me;
// UPDATE CURRENT USER ROLE
// Protected endpoint: role change is applied to the authenticated user only.
const updateMyRole = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const targetRole = String(req.body?.targetRole || "").toUpperCase();
        if (targetRole !== "PROFESSIONAL") {
            return res.status(400).json({ message: "Only PROFESSIONAL target role is supported." });
        }
        const user = await auth_service_1.authService.upgradeCurrentUserRole(userId, "PROFESSIONAL");
        return res.json({ message: "Role upgraded successfully.", user });
    }
    catch (err) {
        console.error("updateMyRole error:", err);
        return res.status(400).json({ message: err?.message || "Failed to update role." });
    }
};
exports.updateMyRole = updateMyRole;
//# sourceMappingURL=auth.controller.js.map