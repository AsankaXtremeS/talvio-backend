import { NextFunction, Request, Response } from "express";
import { authService } from "./auth.service";
import passport, { OAuthProviderPayload } from "../../config/passport";
import {
  validateRegisterUser,
  validateRegisterEmployer,
  validateLogin,
} from "./auth.validation";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";

const getSecureCookieFlag = (req: Request) => {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const isForwardedHttps =
    typeof forwardedProto === "string"
      ? forwardedProto.includes("https")
      : Array.isArray(forwardedProto)
        ? forwardedProto.some((value) => value.includes("https"))
        : false;

  return req.secure || isForwardedHttps;
};

const buildAuthCookieOptions = (req: Request, maxAge: number) => {
  const secure = getSecureCookieFlag(req);
  const sameSite: "none" | "lax" = secure ? "none" : "lax";
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

const DEV_FALLBACK_EMPLOYER_EMAIL =
  (process.env.DEV_FALLBACK_EMPLOYER_EMAIL || "employer@test.com").trim().toLowerCase();
const DEV_FALLBACK_EMPLOYER_PASSWORD =
  process.env.DEV_FALLBACK_EMPLOYER_PASSWORD || "Test@1234";

const isDbUnavailableError = (errorName: string, message: string): boolean =>
  errorName === "PrismaClientInitializationError" ||
  errorName === "PrismaClientKnownRequestError" ||
  message.toLowerCase().includes("can't reach database server") ||
  message.toLowerCase().includes("database");

const canUseDevFallbackLogin = (req: Request): boolean => {
  if (process.env.NODE_ENV === "production") return false;
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  return email === DEV_FALLBACK_EMPLOYER_EMAIL && password === DEV_FALLBACK_EMPLOYER_PASSWORD;
};

const sanitizeRegistrationError = (message?: string, fallback?: string) => {
  if (!message) return fallback || "Registration failed. Please try again.";

  if (message === "User already exists") return "User already exists";
  if (message === "Business registration PDF is required") return message;
  return fallback || "Registration failed. Please try again.";
};

// REGISTER STUDENT / PROFESSIONAL
// Public endpoint for registering a new student or professional user.
// Expects: { firstName, lastName, email, password, confirmPassword, role }
// Only allows role: STUDENT or PROFESSIONAL
// Returns: { accessToken, refreshToken } on success

export const registerUser = async (req: Request, res: Response) => {
  try {
    validateRegisterUser(req.body);
    await authService.registerUser(req.body);
    res.status(201).json({ message: "Registration successful. Please log in." });
  } catch (err: any) {
    console.error("registerUser error:", err);
    res.status(400).json({ message: sanitizeRegistrationError(err?.message) });
  }
};



// REGISTER EMPLOYER (WITH PDF UPLOAD)
// Public endpoint for registering a new employer user.
// Expects: { email, password, confirmPassword, companyName } and PDF file (registrationFile)
// Returns: { message, userId } on success. Requires admin approval before login.


export const registerEmployer = async (req: Request, res: Response) => {
  try {
    const { registrationFileUrl, registrationFileName } = req.body;
    if (!registrationFileUrl) {
      throw new Error("Business registration PDF URL is required");
    }
    validateRegisterEmployer(req.body);
    const result = await authService.registerEmployer({
      ...req.body,
      registrationFileUrl,
      registrationFileName: registrationFileName || "BusinessRegistration.pdf",
    });
    res.status(201).json(result);
  } catch (err: any) {
    console.error("registerEmployer error:", err);
    res.status(400).json({
      message: sanitizeRegistrationError(err?.message, "Employer registration failed. Please try again."),
    });
  }
};



// LOGIN
// Public endpoint for user login.
// Expects: { email, password }
// Returns: { accessToken, refreshToken } on success


export const login = async (req: Request, res: Response) => {
  try {
    validateLogin(req.body);
    const { accessToken, refreshToken, user } = await authService.login(req.body);

    if (!accessToken || !refreshToken) {
      console.error("Token generation failed: accessToken or refreshToken is missing");
      return res.status(500).json({ message: "Token generation failed" });
    }

    res.cookie("accessToken", accessToken, buildAuthCookieOptions(req, ACCESS_COOKIE_MAX_AGE));
    res.cookie("refreshToken", refreshToken, buildAuthCookieOptions(req, REFRESH_COOKIE_MAX_AGE));

    console.log(`User ${user.id} logged in successfully with role ${user.role}`);
    res.json({ user, accessToken, refreshToken });
  } catch (err: any) {
    console.error("login error:", err);
    const message = typeof err?.message === "string" ? err.message : "Login failed. Please check your credentials.";
    const errorName = typeof err?.name === "string" ? err.name : "";

    if (isDbUnavailableError(errorName, message)) {
      if (canUseDevFallbackLogin(req)) {
        const fallbackUser = {
          id: "00000000-0000-0000-0000-000000000001",
          role: "EMPLOYER",
          email: DEV_FALLBACK_EMPLOYER_EMAIL,
        } as const;

        const accessToken = generateAccessToken({
          userId: fallbackUser.id,
          role: fallbackUser.role,
        });
        const refreshToken = generateRefreshToken({ userId: fallbackUser.id });

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



// REFRESH TOKEN
// Public endpoint to refresh access and refresh tokens.
// Expects: { refreshToken }
// Returns: { accessToken, refreshToken } on success


export const refresh = async (req: Request, res: Response) => {
  try {
    const cookieToken = req.cookies?.refreshToken;
    const bodyToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : undefined;
    const token = cookieToken || bodyToken;
    if (!token) {
      return res.status(401).json({ message: "No refresh token" });
    }
    const { accessToken, refreshToken, user } = await authService.refresh(token);

    res.cookie("accessToken", accessToken, buildAuthCookieOptions(req, ACCESS_COOKIE_MAX_AGE));
    res.cookie("refreshToken", refreshToken, buildAuthCookieOptions(req, REFRESH_COOKIE_MAX_AGE));

    res.json({ user, accessToken, refreshToken });
  } catch (err: any) {
    console.error("refresh error:", err);
    res.status(401).json({ message: "Token refresh failed." });
  }
};



// LOGOUT
// Public endpoint to revoke a refresh token (logout).
// Expects: { refreshToken }
// Returns: { message } on success


export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) await authService.logout(token);

    const secure = getSecureCookieFlag(req);
    const sameSite: "none" | "lax" = secure ? "none" : "lax";
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
  } catch (err: any) {
    console.error("logout error:", err);
    res.status(400).json({ message: "Logout failed." });
  }
};



// FORGOT PASSWORD
// Public endpoint to request a password reset link.
// Expects: { email }
// Returns: { message } (always generic for security)


export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new Error("Email required");
    }
    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (err: any) {
    console.error("forgotPassword error:", err);
    res.status(400).json({ message: "Password reset request failed." });
  }
};



// RESET PASSWORD
// Public endpoint to reset password using a reset token.
// Expects: { token, newPassword }
// Returns: { message } on success


export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw new Error("Token and new password required");
    }
    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (err: any) {
    console.error("resetPassword error:", err);
    res.status(400).json({ message: "Password reset failed." });
  }
};



// ADMIN APPROVE EMPLOYER
// Admin-only endpoint to approve an employer account.
// Expects: { userId }
// Returns: { message } on success


export const approveEmployer = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      throw new Error("User ID required");
    }
    const result = await authService.approveEmployer(userId);
    res.json(result);
  } catch (err: any) {
    console.error("approveEmployer error:", err);
    res.status(400).json({ message: "Employer approval failed." });
  }
};


// ADMIN REJECT EMPLOYER
// Admin-only endpoint to reject an employer account.
// Expects: { userId }
// Returns: { message } on success


export const rejectEmployer = async (req: Request, res: Response) => {
  try {
    const { userId, reason } = req.body;
    if (!userId) throw new Error("User ID required");
    const result = await authService.rejectEmployer(userId, reason);
    res.json(result);
  } catch (err: any) {
    console.error("rejectEmployer error:", err);
    res.status(400).json({ message: "Employer rejection failed." });
  }
};


// ADMIN GET EMPLOYERS BY STATUS
// Admin-only endpoint to list employer registrations by verification status.
// Query: ?status=pending|approved|rejected
// Returns: array of users with employerProfile


export const getEmployersByStatus = async (req: Request, res: Response) => {
  try {
    const status = String(req.query.status || "").toLowerCase();
    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Use pending, approved, or rejected.",
      });
    }

    const employers = await authService.getEmployersByStatus(status as "pending" | "approved" | "rejected");
    res.json(employers);
  } catch (err: any) {
    console.error("getEmployersByStatus error:", err);
    res.status(500).json({ message: "Failed to fetch employers." });
  }
};


// ADMIN GET PENDING EMPLOYERS
// Admin-only endpoint to list all pending employer registrations.
// Returns: array of users with employerProfile


export const getPendingEmployers = async (req: Request, res: Response) => {
  try {
    const employers = await authService.getPendingEmployers();
    res.json(employers);
  } catch (err: any) {
    console.error("getPendingEmployers error:", err);
    res.status(500).json({ message: "Failed to fetch pending employers." });
  }
};

// OAUTH START
// Public endpoint to initiate OAuth flow with Google or LinkedIn.
// Expects: provider in URL params, role in query (STUDENT or PROFESSIONAL)
// Redirects to provider's authorization URL
const getOAuthProvider = (providerParam: string | string[] | undefined): "google" | "linkedin" => {
  const rawProvider = Array.isArray(providerParam) ? providerParam[0] : providerParam;
  const provider = String(rawProvider || "").toLowerCase();
  if (provider !== "google" && provider !== "linkedin") {
    throw new Error("Unsupported OAuth provider");
  }
  return provider;
};

export const oauthStart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const provider = getOAuthProvider(req.params.provider);
    const role = String(req.query.role || "").toUpperCase();

    const state = authService.createOAuthState(provider, role);
    const scope = ["openid", "email", "profile"];

    const authOptions: Record<string, unknown> = {
      scope,
      session: false,
      state,
    };

    // Force Google to show account selection instead of silently reusing a signed-in account.
    if (provider === "google") {
      authOptions.prompt = "select_account";
      authOptions.accessType = "offline";
    }

    return passport.authenticate(provider, authOptions)(req, res, next);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "OAuth initialization failed";
    console.error("oauthStart error:", err);
    return res.status(400).json({ message });
  }
};

export const oauthCallback = async (req: Request, res: Response, next: NextFunction) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  try {
    const provider = getOAuthProvider(req.params.provider);
    const state = String(req.query.state || "");

    return passport.authenticate(
      provider,
      { session: false },
      async (err: unknown, oauthPayload?: OAuthProviderPayload) => {
        if (err || !oauthPayload) {
          const authError = err instanceof Error ? err.message : "OAuth callback failed";
          console.error("oauthCallback passport error:", err);
          return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(authError)}`);
        }

        try {
          const { accessToken, refreshToken } = await authService.completeOAuthCallback(
            provider,
            state,
            oauthPayload
          );

          res.cookie("accessToken", accessToken, buildAuthCookieOptions(req, ACCESS_COOKIE_MAX_AGE));
          res.cookie("refreshToken", refreshToken, buildAuthCookieOptions(req, REFRESH_COOKIE_MAX_AGE));

          return res.redirect(`${frontendUrl}/oauth/callback`);
        } catch (callbackError: unknown) {
          const message = callbackError instanceof Error ? callbackError.message : "OAuth callback failed";
          console.error("oauthCallback error:", callbackError);
          return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
        }
      }
    )(req, res, next);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "OAuth callback failed";
    console.error("oauthCallback error:", err);
    return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent(message)}`);
  }
};

// CURRENT SESSION USER
// Protected endpoint for reading the authenticated user's own profile.
// Identity is derived from auth middleware (token/cookie), not URL or request body.
export const me = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await authService.getCurrentUser(userId);
    return res.json({ user });
  } catch (err: any) {
    console.error("me error:", err);
    return res.status(400).json({ message: err?.message || "Failed to load session user." });
  }
};

// UPDATE CURRENT USER ROLE
// Protected endpoint: role change is applied to the authenticated user only.
export const updateMyRole = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const targetRole = String(req.body?.targetRole || "").toUpperCase();
    if (targetRole !== "PROFESSIONAL") {
      return res.status(400).json({ message: "Only PROFESSIONAL target role is supported." });
    }

    const user = await authService.upgradeCurrentUserRole(userId, "PROFESSIONAL");
    return res.json({ message: "Role upgraded successfully.", user });
  } catch (err: any) {
    console.error("updateMyRole error:", err);
    return res.status(400).json({ message: err?.message || "Failed to update role." });
  }
};