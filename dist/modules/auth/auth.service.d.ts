import { OAuthProviderPayload } from "../../config/passport";
type OAuthProvider = "google" | "linkedin";
export declare const authService: {
    getCurrentUser(userId: string): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        firstName: string | null;
        lastName: string | null;
        preferences: {
            locale: string;
            theme: string;
        };
        permissions: import(".prisma/client").$Enums.Role[];
        employerProfile: {
            companyName: string;
            companyLogoUrl: string | null;
            verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
            rejectionReason: string | null;
        } | null;
    }>;
    upgradeCurrentUserRole(userId: string, targetRole: "PROFESSIONAL"): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        firstName: string | null;
        lastName: string | null;
        preferences: {
            locale: string;
            theme: string;
        };
        permissions: import(".prisma/client").$Enums.Role[];
        employerProfile: {
            companyName: string;
            companyLogoUrl: string | null;
            verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
            rejectionReason: string | null;
        } | null;
    }>;
    registerUser(data: any): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    registerEmployer(data: any): Promise<{
        message: string;
        userId: string;
    }>;
    login(data: any): Promise<{
        user: {
            id: any;
            email: any;
            role: any;
            firstName: any;
            lastName: any;
            preferences: {
                locale: string;
                theme: string;
            };
            permissions: any[];
            employerProfile: {
                companyName: any;
                companyLogoUrl: any;
                verificationStatus: any;
                rejectionReason: any;
            } | null;
        };
        accessToken: string;
        refreshToken: string;
    }>;
    refresh(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            role: any;
            firstName: any;
            lastName: any;
            preferences: {
                locale: string;
                theme: string;
            };
            permissions: any[];
            employerProfile: {
                companyName: any;
                companyLogoUrl: any;
                verificationStatus: any;
                rejectionReason: any;
            } | null;
        };
    }>;
    logout(token: string): Promise<{
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    approveEmployer(userId: string): Promise<{
        message: string;
    }>;
    rejectEmployer(userId: string, reason?: string): Promise<{
        message: string;
    }>;
    getEmployersByStatus(status: "pending" | "approved" | "rejected"): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        employerProfile: {
            createdAt: Date;
            companyName: string;
            registrationFileUrl: string;
            registrationFileName: string;
            verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
            rejectionReason: string | null;
        } | null;
    }[]>;
    getPendingEmployers(): Promise<{
        id: string;
        email: string;
        createdAt: Date;
        employerProfile: {
            createdAt: Date;
            companyName: string;
            registrationFileUrl: string;
            registrationFileName: string;
            verificationStatus: import(".prisma/client").$Enums.VerificationStatus;
            rejectionReason: string | null;
        } | null;
    }[]>;
    createOAuthState(provider: OAuthProvider, role: string): string;
    completeOAuthCallback(provider: OAuthProvider, state: string, oauthPayload: OAuthProviderPayload): Promise<{
        user: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
        };
        accessToken: string;
        refreshToken: string;
    }>;
};
export {};
//# sourceMappingURL=auth.service.d.ts.map