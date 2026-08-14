"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileService = void 0;
const profile_repository_1 = require("./profile.repository");
const googleapis_1 = require("googleapis");
const buildHttpError = (message, statusCode) => {
    const err = new Error(message);
    err.statusCode = statusCode;
    return err;
};
const mapToDTO = (profile) => ({
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
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
    user: {
        id: profile.user.id,
        email: profile.user.email,
        firstName: profile.user.firstName ?? null,
        lastName: profile.user.lastName ?? null,
    },
});
const resolveProfile = async (userId) => {
    const profile = await profile_repository_1.profileRepository.findByUserId(userId);
    if (!profile)
        throw buildHttpError("Employer profile not found.", 404);
    return profile;
};
exports.profileService = {
    async getProfile(userId) {
        const profile = await resolveProfile(userId);
        return mapToDTO(profile);
    },
    async updateProfile(userId, data) {
        const profile = await resolveProfile(userId);
        if (profile.verificationStatus !== "APPROVED") {
            throw buildHttpError("Only approved employers can update their profile.", 403);
        }
        const updated = await profile_repository_1.profileRepository.updateByUserId(userId, data);
        return mapToDTO(updated);
    },
    async getCalendarAuthUrl() {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI;
        if (!clientId || !clientSecret || !redirectUri) {
            throw buildHttpError("Google OAuth2 configuration is missing in .env", 500);
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
        return oauth2Client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent",
            scope: ["https://www.googleapis.com/auth/calendar"],
        });
    },
    async connectCalendar(userId, code) {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI;
        if (!clientId || !clientSecret || !redirectUri) {
            throw buildHttpError("Google OAuth2 configuration is missing in .env", 500);
        }
        const oauth2Client = new googleapis_1.google.auth.OAuth2(clientId, clientSecret, redirectUri);
        try {
            const { tokens } = await oauth2Client.getToken(code);
            const updated = await profile_repository_1.profileRepository.updateGoogleTokensByUserId(userId, {
                googleAccessToken: tokens.access_token ?? null,
                googleRefreshToken: tokens.refresh_token ?? null,
                googleTokenExpiry: typeof tokens.expiry_date === 'number' ? BigInt(tokens.expiry_date) : null,
                googleCalendarConnected: true
            });
            return mapToDTO(updated);
        }
        catch (err) {
            console.error("Failed to exchange Google OAuth code:", err);
            throw buildHttpError("Failed to connect Google Calendar. Please try again.", 400);
        }
    },
    async disconnectCalendar(userId) {
        const updated = await profile_repository_1.profileRepository.updateGoogleTokensByUserId(userId, {
            googleAccessToken: null,
            googleRefreshToken: null,
            googleTokenExpiry: null,
            googleCalendarConnected: false
        });
        return mapToDTO(updated);
    }
};
//# sourceMappingURL=profile.service.js.map