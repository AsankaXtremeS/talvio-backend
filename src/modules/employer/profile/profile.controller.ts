// Controller layer for employer profile management.
//
// A controller's ONLY job is HTTP: read the request, call the service,
// send the response. No business logic or DB queries belong here.
//
// Error handling pattern (same as jobPosts.controller.ts):
//   Services throw errors with a statusCode property for known cases (403, 404).
//   resolveStatusCode() reads that to set the right HTTP status.
//   Anything without a statusCode falls back to 500.

import { Request, Response } from "express";
import { profileService } from "./profile.service";
import { updateProfileSchema } from "./profile.validation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolveStatusCode = (err: any): number => {
  if (isDbUnavailableError(err)) return 503;
  if (typeof err?.statusCode === "number") return err.statusCode;
  return 500;
};

const isDbUnavailableError = (err: any): boolean => {
  const message = typeof err?.message === "string" ? err.message.toLowerCase() : "";
  const name = typeof err?.name === "string" ? err.name : "";
  return (
    name === "PrismaClientInitializationError" ||
    name === "PrismaClientKnownRequestError" ||
    message.includes("can't reach database server") ||
    message.includes("database") ||
    message.includes("p1001")
  );
};

const isPrismaError = (err: any): boolean => {
  const name = typeof err?.name === "string" ? err.name : "";
  const message = typeof err?.message === "string" ? err.message : "";
  return (
    name.startsWith("Prisma") ||
    message.includes("Invalid `prisma.") ||
    message.includes("Unknown field") ||
    message.includes("invocation in")
  );
};

const getPublicErrorMessage = (err: any, fallback: string): string => {
  if (isDbUnavailableError(err)) {
    return "Service temporarily unavailable. Please try again in a moment.";
  }
  if (isPrismaError(err)) {
    return fallback;
  }
  if (typeof err?.message === "string" && err.message.trim() && !err.message.includes("prisma.")) {
    return err.message;
  }
  return fallback;
};

const logControllerError = (scope: string, err: any): void => {
  if (isDbUnavailableError(err)) {
    console.error(`${scope} error: database unavailable`);
    return;
  }
  console.error(`${scope} error:`, err);
};

// userId always comes from the verified JWT payload set by the authenticate
// middleware — never from req.body or req.params. This is the key IDOR guard.
const getUserId = (req: Request): string | null => {
  return (req.user as any)?.id ?? (req.user as any)?.userId ?? null;
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

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await profileService.getProfile(userId);
    res.json(profile);
  } catch (err: any) {
    logControllerError("getProfile", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to fetch profile."),
    });
  }
};


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

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    // Validate input with Zod — unknown fields are stripped automatically
    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const updated = await profileService.updateProfile(userId, parseResult.data);
    res.json(updated);
  } catch (err: any) {
    logControllerError("updateProfile", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to update profile."),
    });
  }
};


// ─── GET /api/employer/profile/calendar/auth-url ─────────────────────────────
//
// Generates the OAuth2 consent URL (Google or Microsoft) for the employer.
// Query: ?email=...
// Response: { url: string, provider: string }

export const getCalendarAuthUrl = async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    if (!email) {
      return res.status(400).json({ message: "Email parameter is required" });
    }
    const result = await profileService.getCalendarAuthUrl(email);
    res.json(result);
  } catch (err: any) {
    logControllerError("getCalendarAuthUrl", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to generate auth URL."),
    });
  }
};


// ─── POST /api/employer/profile/calendar/connect ─────────────────────────────
//
// Exchanges the OAuth code for tokens and saves them.
// Request body: { code: string, provider: string }
// Response: EmployerProfileDTO

export const connectCalendar = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { code, provider } = req.body;
    if (!code) return res.status(400).json({ message: "Auth code is required" });
    if (!provider) return res.status(400).json({ message: "Provider is required" });

    const profile = await profileService.connectCalendar(userId, code, provider);
    res.json(profile);
  } catch (err: any) {
    logControllerError("connectCalendar", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to connect calendar."),
    });
  }
};


// ─── POST /api/employer/profile/calendar/disconnect ──────────────────────────
//
// Removes Google tokens and disconnects the calendar.
// Response: EmployerProfileDTO

export const disconnectCalendar = async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await profileService.disconnectCalendar(userId);
    res.json(profile);
  } catch (err: any) {
    logControllerError("disconnectCalendar", err);
    res.status(resolveStatusCode(err)).json({
      message: getPublicErrorMessage(err, "Failed to disconnect calendar."),
    });
  }
};


// ─── GET /api/v1/calendar/microsoft/callback ──────────────────────────────────
//
// PUBLIC route — no auth middleware.
// Microsoft redirects the browser here after the user consents.
// We simply forward the ?code and ?error to the frontend profile page
// so the frontend JS can call POST /calendar/connect with the code.
//
// Query params from Microsoft: code, state, session_state, error, error_description

export const microsoftCalendarCallback = (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const callbackPage = `${frontendUrl}/users/employer/profile`;

  const { code, error, error_description } = req.query;

  if (error) {
    const msg = encodeURIComponent((error_description as string) || (error as string) || "Microsoft auth failed");
    return res.redirect(`${callbackPage}?calendar_error=${msg}`);
  }

  if (!code) {
    return res.redirect(`${callbackPage}?calendar_error=${encodeURIComponent("No authorization code received from Microsoft.")}`);
  }

  // Forward the code and provider to the frontend; the frontend will call
  // POST /api/employer/profile/calendar/connect with { code, provider: "microsoft" }
  return res.redirect(`${callbackPage}?code=${encodeURIComponent(code as string)}&provider=microsoft`);
};