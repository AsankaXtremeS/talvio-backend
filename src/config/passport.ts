import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as LinkedInStrategy } from "passport-linkedin-oauth2";
import { env } from "./env";
import { Request } from "express";

type OAuthProfile = {
	id?: string;
	displayName?: string;
	emails?: Array<{ value?: string }>;
	name?: { givenName?: string; familyName?: string };
	_json?: { email?: string; sub?: string };
};

export type OAuthProvider = "google" | "linkedin";

export interface OAuthProviderPayload {
	providerUserId: string;
	email: string;
	firstName?: string;
	lastName?: string;
	accessToken?: string;
	refreshToken?: string;
	expiresIn?: number;
}

let initialized = false;

const extractNameParts = (displayName?: string) => {
	const [firstName, ...rest] = (displayName || "").trim().split(/\s+/).filter(Boolean);
	return {
		firstName: firstName || undefined,
		lastName: rest.length > 0 ? rest.join(" ") : undefined,
	};
};

const resolveGoogleProfile = (
	profile: OAuthProfile
): Pick<OAuthProviderPayload, "providerUserId" | "email" | "firstName" | "lastName"> => {
	const email = profile.emails?.[0]?.value || (profile as any)?._json?.email;
	const providerUserId = profile.id || (profile as any)?._json?.sub;
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

const resolveLinkedInProfile = (
	profile: OAuthProfile
): Pick<OAuthProviderPayload, "providerUserId" | "email" | "firstName" | "lastName"> => {
	const email = profile.emails?.[0]?.value || (profile as any)?._json?.email;
	const providerUserId = profile.id || (profile as any)?._json?.sub;
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

export const initializePassport = () => {
	if (initialized) return;

	if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
		passport.use(
			"google",
			new GoogleStrategy(
				{
					clientID: env.GOOGLE_CLIENT_ID,
					clientSecret: env.GOOGLE_CLIENT_SECRET,
					callbackURL: `${env.BACKEND_URL}/api/auth/oauth/google/callback`,
					passReqToCallback: true,
				},
				(
					_req: Request,
					accessToken: string,
					refreshToken: string,
					_params: unknown,
					profile: OAuthProfile,
					done: any
				) => {
					try {
						const profileData = resolveGoogleProfile(profile);
						done(null, {
							...profileData,
							accessToken,
							refreshToken: refreshToken || undefined,
						} as OAuthProviderPayload);
					} catch (error) {
						done(error as Error);
					}
				}
			)
		);
	}

	if (env.LINKEDIN_CLIENT_ID && env.LINKEDIN_CLIENT_SECRET) {
		passport.use(
			"linkedin",
			new LinkedInStrategy(
				{
					clientID: env.LINKEDIN_CLIENT_ID,
					clientSecret: env.LINKEDIN_CLIENT_SECRET,
					callbackURL: `${env.BACKEND_URL}/api/auth/oauth/linkedin/callback`,
					scope: ["openid", "profile", "email"],
				},
				(
					accessToken: string,
					refreshToken: string,
					profile: OAuthProfile,
					done: any
				) => {
					try {
						const profileData = resolveLinkedInProfile(profile);
						done(null, {
							...profileData,
							accessToken,
							refreshToken: refreshToken || undefined,
						} as OAuthProviderPayload);
					} catch (error) {
						done(error as Error);
					}
				}
			)
		);
	}

	initialized = true;
};

export default passport;
