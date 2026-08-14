"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializePassport = void 0;
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_linkedin_oauth2_1 = require("passport-linkedin-oauth2");
const env_1 = require("./env");
let initialized = false;
const extractNameParts = (displayName) => {
    const [firstName, ...rest] = (displayName || "").trim().split(/\s+/).filter(Boolean);
    return {
        firstName: firstName || undefined,
        lastName: rest.length > 0 ? rest.join(" ") : undefined,
    };
};
const resolveGoogleProfile = (profile) => {
    const email = profile.emails?.[0]?.value || profile?._json?.email;
    const providerUserId = profile.id || profile?._json?.sub;
    const firstName = profile.name?.givenName;
    const lastName = profile.name?.familyName;
    if (!providerUserId || !email) {
        throw new Error("Google OAuth response is missing required profile fields");
    }
    const fallback = extractNameParts(profile.displayName);
    return {
        providerUserId,
        email,
        firstName: firstName || fallback.firstName,
        lastName: lastName || fallback.lastName,
    };
};
const resolveLinkedInProfile = (profile) => {
    const email = profile.emails?.[0]?.value || profile?._json?.email;
    const providerUserId = profile.id || profile?._json?.sub;
    const firstName = profile.name?.givenName;
    const lastName = profile.name?.familyName;
    if (!providerUserId || !email) {
        throw new Error("LinkedIn OAuth response is missing required profile fields");
    }
    const fallback = extractNameParts(profile.displayName);
    return {
        providerUserId,
        email,
        firstName: firstName || fallback.firstName,
        lastName: lastName || fallback.lastName,
    };
};
const initializePassport = () => {
    if (initialized)
        return;
    if (env_1.env.GOOGLE_CLIENT_ID && env_1.env.GOOGLE_CLIENT_SECRET) {
        passport_1.default.use("google", new passport_google_oauth20_1.Strategy({
            clientID: env_1.env.GOOGLE_CLIENT_ID,
            clientSecret: env_1.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${env_1.env.BACKEND_URL}/api/auth/oauth/google/callback`,
            passReqToCallback: true,
        }, (_req, accessToken, refreshToken, _params, profile, done) => {
            try {
                const profileData = resolveGoogleProfile(profile);
                done(null, {
                    ...profileData,
                    accessToken,
                    refreshToken: refreshToken || undefined,
                });
            }
            catch (error) {
                done(error);
            }
        }));
    }
    if (env_1.env.LINKEDIN_CLIENT_ID && env_1.env.LINKEDIN_CLIENT_SECRET) {
        passport_1.default.use("linkedin", new passport_linkedin_oauth2_1.Strategy({
            clientID: env_1.env.LINKEDIN_CLIENT_ID,
            clientSecret: env_1.env.LINKEDIN_CLIENT_SECRET,
            callbackURL: `${env_1.env.BACKEND_URL}/api/auth/oauth/linkedin/callback`,
            scope: ["openid", "profile", "email"],
        }, (accessToken, refreshToken, profile, done) => {
            try {
                const profileData = resolveLinkedInProfile(profile);
                done(null, {
                    ...profileData,
                    accessToken,
                    refreshToken: refreshToken || undefined,
                });
            }
            catch (error) {
                done(error);
            }
        }));
    }
    initialized = true;
};
exports.initializePassport = initializePassport;
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map