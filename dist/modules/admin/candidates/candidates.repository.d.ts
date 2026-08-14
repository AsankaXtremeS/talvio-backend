export interface GetCandidatesOptions {
    search?: string;
    role?: "STUDENT" | "PROFESSIONAL";
    page?: number;
    limit?: number;
}
export declare const candidatesRepository: {
    getStats(): Promise<{
        undergraduates: number;
        professionals: number;
    }>;
    findAll(options?: GetCandidatesOptions): Promise<{
        candidates: {
            id: string;
            email: string;
            role: import(".prisma/client").$Enums.Role;
            isVerified: boolean;
            createdAt: Date;
            firstName: string | null;
            lastName: string | null;
            authAccounts: {
                provider: import(".prisma/client").$Enums.AuthProvider;
            }[];
        }[];
        total: number;
    }>;
    findById(userId: string): Promise<{
        id: string;
        email: string;
        role: import(".prisma/client").$Enums.Role;
        isVerified: boolean;
        createdAt: Date;
        firstName: string | null;
        lastName: string | null;
        authAccounts: {
            provider: import(".prisma/client").$Enums.AuthProvider;
        }[];
    } | null>;
    deleteById(userId: string): Promise<{
        id: string;
        email: string;
        password: string | null;
        role: import(".prisma/client").$Enums.Role;
        isVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
        firstName: string | null;
        lastName: string | null;
    }>;
    isCandidate(userId: string): Promise<boolean>;
};
//# sourceMappingURL=candidates.repository.d.ts.map