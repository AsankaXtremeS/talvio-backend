import { profileRepository } from "./profile.repository";
import { UpdateProfileInput } from "./profile.validation";
import { google } from "googleapis";
import { detectEmailProvider } from "../../../utils/providerDetection";
import { microsoftCalendarService } from "../../../utils/microsoftCalendar";

interface ServiceError extends Error {
  statusCode?: number;
}

const buildHttpError = (message: string, statusCode: number): ServiceError => {
  const err: ServiceError = new Error(message);
  err.statusCode = statusCode;
  return err;
};

export interface EmployerProfileDTO {
  id: string;
  companyName: string;
  companyDescription: string | null;
  companyWebsite: string | null;
  companyLocation: string | null;
  companyLogoUrl: string | null;
  coverImageUrl: string | null;
  industry: string | null;
  companyType: string | null;
  companySize: string | null;
  foundedYear: number | null;
  specialties: string | null;
  linkedInUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  registrationFileUrl: string;
  registrationFileName: string;
  verificationStatus: string;
  rejectionReason: string | null;
  googleCalendarConnected: boolean;
  microsoftCalendarConnected: boolean;
  calendarProvider: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}

const mapToDTO = (
  profile: any
): EmployerProfileDTO => ({
  id: profile.id,
  companyName: profile.companyName,
  companyDescription: profile.companyDescription ?? null,
  companyWebsite: profile.companyWebsite ?? null,
  companyLocation: profile.companyLocation ?? null,
  companyLogoUrl: profile.companyLogoUrl ?? null,
  coverImageUrl: profile.coverImageUrl ?? null,
  industry: profile.industry ?? null,
  companyType: profile.companyType ?? null,
  companySize: profile.companySize ?? null,
  foundedYear: profile.foundedYear ?? null,
  specialties: profile.specialties ?? null,
  linkedInUrl: profile.linkedInUrl ?? null,
  facebookUrl: profile.facebookUrl ?? null,
  twitterUrl: profile.twitterUrl ?? null,
  registrationFileUrl: profile.registrationFileUrl,
  registrationFileName: profile.registrationFileName,
  verificationStatus: profile.verificationStatus,
  rejectionReason: profile.rejectionReason ?? null,
  googleCalendarConnected: profile.googleCalendarConnected,
  microsoftCalendarConnected: profile.microsoftCalendarConnected,
  calendarProvider: profile.calendarProvider ?? null,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
  user: {
    id: profile.user.id,
    email: profile.user.email,
    firstName: profile.user.firstName ?? null,
    lastName: profile.user.lastName ?? null,
  },
});

const resolveProfile = async (userId: string) => {
  const profile = await profileRepository.findByUserId(userId);
  if (!profile) throw buildHttpError("Employer profile not found.", 404);
  return profile;
};

export const profileService = {
  async getProfile(userId: string): Promise<EmployerProfileDTO> {
    const profile = await resolveProfile(userId);
    return mapToDTO(profile);
  },

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<EmployerProfileDTO> {
    const profile = await resolveProfile(userId);
    if (profile.verificationStatus !== "APPROVED") {
      throw buildHttpError("Only approved employers can update their profile.", 403);
    }
    const updated = await profileRepository.updateByUserId(userId, data);
    return mapToDTO(updated);
  },

  async getCalendarAuthUrl(email?: string): Promise<{ url: string; provider: "google" | "microsoft" }> {
    const provider = email ? await detectEmailProvider(email) : "google";
    if (provider === "none") {
      throw buildHttpError("Unsupported email provider. Please use a Google Workspace or Microsoft 365 email account.", 400);
    }

    if (provider === "google") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw buildHttpError("Google OAuth2 configuration is missing in .env", 500);
      }

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

      const url = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: ["https://www.googleapis.com/auth/calendar"],
        login_hint: email,
      });

      return { url, provider: "google" };
    } else {
      const url = await microsoftCalendarService.getAuthUrl(email);
      return { url, provider: "microsoft" };
    }
  },

  async connectCalendar(userId: string, code: string, provider: string): Promise<EmployerProfileDTO> {
    if (!provider || (provider !== "google" && provider !== "microsoft")) {
      throw buildHttpError("Invalid or missing calendar provider parameter.", 400);
    }

    if (provider === "google") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw buildHttpError("Google OAuth2 configuration is missing in .env", 500);
      }

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

      try {
        const { tokens } = await oauth2Client.getToken(code);
        
        const updated = await profileRepository.updateGoogleTokensByUserId(userId, {
          googleAccessToken: tokens.access_token ?? null,
          googleRefreshToken: tokens.refresh_token ?? null,
          googleTokenExpiry: typeof tokens.expiry_date === 'number' ? BigInt(tokens.expiry_date) : null,
          googleCalendarConnected: true,
          calendarProvider: "google",
          // Clear Microsoft in case they switched
          microsoftAccessToken: null,
          microsoftRefreshToken: null,
          microsoftTokenExpiry: null,
          microsoftCalendarConnected: false,
        });

        return mapToDTO(updated);
      } catch (err) {
        console.error("Failed to exchange Google OAuth code:", err);
        throw buildHttpError("Failed to connect Google Calendar. Please try again.", 400);
      }
    } else {
      try {
        const tokens = await microsoftCalendarService.exchangeCode(code);

        const updated = await profileRepository.updateGoogleTokensByUserId(userId, {
          microsoftAccessToken: tokens.accessToken,
          microsoftRefreshToken: tokens.refreshToken,
          microsoftTokenExpiry: BigInt(tokens.expiresAt),
          microsoftCalendarConnected: true,
          calendarProvider: "microsoft",
          // Clear Google in case they switched
          googleAccessToken: null,
          googleRefreshToken: null,
          googleTokenExpiry: null,
          googleCalendarConnected: false,
        });

        return mapToDTO(updated);
      } catch (err) {
        console.error("Failed to exchange Microsoft OAuth code:", err);
        throw buildHttpError("Failed to connect Microsoft Calendar. Please try again.", 400);
      }
    }
  },

  async disconnectCalendar(userId: string): Promise<EmployerProfileDTO> {
    const updated = await profileRepository.updateGoogleTokensByUserId(userId, {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleTokenExpiry: null,
      googleCalendarConnected: false,
      microsoftAccessToken: null,
      microsoftRefreshToken: null,
      microsoftTokenExpiry: null,
      microsoftCalendarConnected: false,
      calendarProvider: null,
    });

    return mapToDTO(updated);
  }
};