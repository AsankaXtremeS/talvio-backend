import passport from "passport";
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
export declare const initializePassport: () => void;
export default passport;
//# sourceMappingURL=passport.d.ts.map