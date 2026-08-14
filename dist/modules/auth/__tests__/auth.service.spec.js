"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_service_1 = require("../auth.service");
const auth_repository_1 = require("../auth.repository");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwtUtils = __importStar(require("../../../utils/jwt"));
const emailUtils = __importStar(require("../../../utils/email"));
// Mock the dependencies
jest.mock("../auth.repository");
jest.mock("bcrypt");
jest.mock("../../../utils/jwt");
jest.mock("../../../utils/email");
jest.mock("../../../config/db", () => ({
    prisma: {
        $transaction: jest.fn(),
    },
}));
describe("authService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe("registerUser", () => {
        const registrationData = {
            email: "test@example.com",
            password: "password123",
            firstName: "John",
            lastName: "Doe",
            role: "STUDENT",
        };
        it("should successfully register a new user", async () => {
            auth_repository_1.authRepository.findUserByEmail.mockResolvedValue(null);
            bcrypt_1.default.hash.mockResolvedValue("hashedPassword");
            auth_repository_1.authRepository.createUser.mockResolvedValue({
                id: "user-123",
                role: "STUDENT",
            });
            jwtUtils.generateAccessToken.mockReturnValue("access-token");
            jwtUtils.generateRefreshToken.mockReturnValue("refresh-token");
            auth_repository_1.authRepository.createRefreshToken.mockResolvedValue({});
            const result = await auth_service_1.authService.registerUser(registrationData);
            expect(auth_repository_1.authRepository.findUserByEmail).toHaveBeenCalledWith("test@example.com");
            expect(bcrypt_1.default.hash).toHaveBeenCalledWith("password123", 10);
            expect(auth_repository_1.authRepository.createUser).toHaveBeenCalled();
            expect(result).toEqual({
                accessToken: "access-token",
                refreshToken: "refresh-token",
            });
        });
        it("should throw an error if user already exists", async () => {
            auth_repository_1.authRepository.findUserByEmail.mockResolvedValue({ id: "1" });
            await expect(auth_service_1.authService.registerUser(registrationData)).rejects.toThrow("User already exists");
        });
        it("should throw an error if role is invalid", async () => {
            auth_repository_1.authRepository.findUserByEmail.mockResolvedValue(null);
            const invalidData = { ...registrationData, role: "ADMIN" };
            await expect(auth_service_1.authService.registerUser(invalidData)).rejects.toThrow("Invalid role. Only STUDENT or PROFESSIONAL registration allowed.");
        });
    });
    describe("login", () => {
        const loginData = {
            email: "test@example.com",
            password: "password123",
        };
        const mockUser = {
            id: "user-123",
            email: "test@example.com",
            password: "hashedPassword",
            role: "STUDENT",
            firstName: "John",
            lastName: "Doe",
        };
        it("should successfully login a user", async () => {
            auth_repository_1.authRepository.findUserByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(true);
            jwtUtils.generateAccessToken.mockReturnValue("access-token");
            jwtUtils.generateRefreshToken.mockReturnValue("refresh-token");
            const result = await auth_service_1.authService.login(loginData);
            expect(result.accessToken).toBe("access-token");
            expect(result.user.email).toBe("test@example.com");
        });
        it("should throw error for invalid credentials", async () => {
            auth_repository_1.authRepository.findUserByEmail.mockResolvedValue(mockUser);
            bcrypt_1.default.compare.mockResolvedValue(false);
            await expect(auth_service_1.authService.login(loginData)).rejects.toThrow("Invalid credentials");
        });
        it("should handle pending employer account", async () => {
            const employerUser = {
                ...mockUser,
                role: "EMPLOYER",
                employerProfile: {
                    verificationStatus: "PENDING",
                },
            };
            auth_repository_1.authRepository.findUserByEmail.mockResolvedValue(employerUser);
            bcrypt_1.default.compare.mockResolvedValue(true);
            await expect(auth_service_1.authService.login(loginData)).rejects.toThrow("Account pending admin approval");
        });
    });
    describe("refresh", () => {
        it("should successfully refresh tokens", async () => {
            const oldToken = "old-refresh-token";
            const mockStoredToken = {
                token: "hashed-old-token",
                isRevoked: false,
                expiresAt: new Date(Date.now() + 10000),
                userId: "user-123",
            };
            const mockUser = { id: "user-123", role: "STUDENT", email: "test@example.com" };
            auth_repository_1.authRepository.findRefreshToken.mockResolvedValue(mockStoredToken);
            jwtUtils.verifyRefreshToken.mockReturnValue({ userId: "user-123" });
            jwtUtils.generateRefreshToken.mockReturnValue("new-refresh-token");
            auth_repository_1.authRepository.findUserById.mockResolvedValue(mockUser);
            jwtUtils.generateAccessToken.mockReturnValue("new-access-token");
            const result = await auth_service_1.authService.refresh(oldToken);
            expect(result.accessToken).toBe("new-access-token");
            expect(result.refreshToken).toBe("new-refresh-token");
            expect(auth_repository_1.authRepository.revokeRefreshToken).toHaveBeenCalled();
        });
        it("should throw error if token is expired", async () => {
            const oldToken = "old-refresh-token";
            const mockStoredToken = {
                token: "hashed-old-token",
                isRevoked: false,
                expiresAt: new Date(Date.now() - 10000),
                userId: "user-123",
            };
            auth_repository_1.authRepository.findRefreshToken.mockResolvedValue(mockStoredToken);
            await expect(auth_service_1.authService.refresh(oldToken)).rejects.toThrow("Refresh token expired");
        });
    });
    describe("forgotPassword", () => {
        it("should create a reset token and send an email", async () => {
            const email = "test@example.com";
            auth_repository_1.authRepository.findUserByEmail.mockResolvedValue({ id: "user-123", email });
            const result = await auth_service_1.authService.forgotPassword(email);
            expect(auth_repository_1.authRepository.createPasswordResetToken).toHaveBeenCalled();
            expect(emailUtils.sendPasswordResetEmail).toHaveBeenCalled();
            expect(result.message).toBe("If email exists, reset link sent");
        });
    });
    describe("upgradeCurrentUserRole", () => {
        it("should upgrade a STUDENT to PROFESSIONAL", async () => {
            const user = { id: "user-123", role: "STUDENT" };
            auth_repository_1.authRepository.findUserById.mockResolvedValue(user);
            auth_repository_1.authRepository.updateUserRole.mockResolvedValue({});
            const getCurrentUserSpy = jest.spyOn(auth_service_1.authService, "getCurrentUser").mockResolvedValue({ id: "user-123", role: "PROFESSIONAL" });
            const result = await auth_service_1.authService.upgradeCurrentUserRole("user-123", "PROFESSIONAL");
            expect(auth_repository_1.authRepository.updateUserRole).toHaveBeenCalledWith("user-123", "PROFESSIONAL");
            expect(result.role).toBe("PROFESSIONAL");
            getCurrentUserSpy.mockRestore();
        });
        it("should throw error if user is not STUDENT", async () => {
            const user = { id: "user-123", role: "EMPLOYER" };
            auth_repository_1.authRepository.findUserById.mockResolvedValue(user);
            await expect(auth_service_1.authService.upgradeCurrentUserRole("user-123", "PROFESSIONAL")).rejects.toThrow("This account type cannot be changed.");
        });
    });
    describe("registerEmployer", () => {
        it("should successfully register an employer", async () => {
            const data = {
                email: "employer@example.com",
                password: "password123",
                companyName: "Talvio Inc",
                registrationFileUrl: "url",
                registrationFileName: "file.pdf",
            };
            auth_repository_1.authRepository.findUserByEmail.mockResolvedValue(null);
            bcrypt_1.default.hash.mockResolvedValue("hashed");
            auth_repository_1.authRepository.findUserByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "emp-123" });
            const result = await auth_service_1.authService.registerEmployer(data);
            expect(result.message).toBe("Registration successful. Await admin approval.");
            expect(result.userId).toBe("emp-123");
        });
    });
    describe("logout", () => {
        it("should revoke the refresh token", async () => {
            const token = "refresh-token";
            await auth_service_1.authService.logout(token);
            expect(auth_repository_1.authRepository.revokeRefreshToken).toHaveBeenCalled();
        });
    });
    describe("resetPassword", () => {
        it("should reset password with valid token", async () => {
            const token = "valid-token";
            const storedToken = { userId: "user-123", expiresAt: new Date(Date.now() + 10000) };
            auth_repository_1.authRepository.findPasswordResetToken.mockResolvedValue(storedToken);
            bcrypt_1.default.hash.mockResolvedValue("new-hashed-password");
            const result = await auth_service_1.authService.resetPassword(token, "NewPassword123!");
            expect(auth_repository_1.authRepository.updateUserPassword).toHaveBeenCalledWith("user-123", "new-hashed-password");
            expect(auth_repository_1.authRepository.deletePasswordResetToken).toHaveBeenCalled();
            expect(result.message).toBe("Password reset successful");
        });
        it("should throw error if token is invalid or expired", async () => {
            auth_repository_1.authRepository.findPasswordResetToken.mockResolvedValue(null);
            await expect(auth_service_1.authService.resetPassword("invalid", "NewPassword123!")).rejects.toThrow("Invalid or expired token");
        });
    });
    describe("employer management", () => {
        it("should approve an employer", async () => {
            await auth_service_1.authService.approveEmployer("emp-123");
            expect(auth_repository_1.authRepository.approveEmployer).toHaveBeenCalledWith("emp-123");
        });
        it("should reject an employer", async () => {
            await auth_service_1.authService.rejectEmployer("emp-123", "Reason");
            expect(auth_repository_1.authRepository.rejectEmployer).toHaveBeenCalledWith("emp-123", "Reason");
        });
    });
});
//# sourceMappingURL=auth.service.spec.js.map