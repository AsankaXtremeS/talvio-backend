import { UpdateProfileInput } from "./profile.validation";
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
    createdAt: string;
    updatedAt: string;
    user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
    };
}
export declare const profileService: {
    getProfile(userId: string): Promise<EmployerProfileDTO>;
    updateProfile(userId: string, data: UpdateProfileInput): Promise<EmployerProfileDTO>;
    getCalendarAuthUrl(): Promise<string>;
    connectCalendar(userId: string, code: string): Promise<EmployerProfileDTO>;
    disconnectCalendar(userId: string): Promise<EmployerProfileDTO>;
};
//# sourceMappingURL=profile.service.d.ts.map