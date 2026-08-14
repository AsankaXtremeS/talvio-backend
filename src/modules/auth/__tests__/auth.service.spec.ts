import { authService } from "../auth.service";
import { authRepository } from "../auth.repository";
import bcrypt from "bcrypt";
import * as jwtUtils from "../../../utils/jwt";
import * as emailUtils from "../../../utils/email";

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
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");
      (authRepository.createUser as jest.Mock).mockResolvedValue({
        id: "user-123",
        role: "STUDENT",
      });
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("access-token");
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("refresh-token");
      (authRepository.createRefreshToken as jest.Mock).mockResolvedValue({});

      const result = await authService.registerUser(registrationData);

      expect(authRepository.findUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(authRepository.createUser).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });

    it("should throw an error if user already exists", async () => {
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue({ id: "1" });

      await expect(authService.registerUser(registrationData)).rejects.toThrow("User already exists");
    });

    it("should throw an error if role is invalid", async () => {
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
      const invalidData = { ...registrationData, role: "ADMIN" };

      await expect(authService.registerUser(invalidData)).rejects.toThrow(
        "Invalid role. Only STUDENT or PROFESSIONAL registration allowed."
      );
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
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("access-token");
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("refresh-token");

      const result = await authService.login(loginData);

      expect(result.accessToken).toBe("access-token");
      expect(result.user.email).toBe("test@example.com");
    });

    it("should throw error for invalid credentials", async () => {
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login(loginData)).rejects.toThrow("Invalid credentials");
    });

    it("should handle pending employer account", async () => {
      const employerUser = {
        ...mockUser,
        role: "EMPLOYER",
        employerProfile: {
          verificationStatus: "PENDING",
        },
      };
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(employerUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(authService.login(loginData)).rejects.toThrow("Account pending admin approval");
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

      (authRepository.findRefreshToken as jest.Mock).mockResolvedValue(mockStoredToken);
      (jwtUtils.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: "user-123" });
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("new-refresh-token");
      (authRepository.findUserById as jest.Mock).mockResolvedValue(mockUser);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("new-access-token");

      const result = await authService.refresh(oldToken);

      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBe("new-refresh-token");
      expect(authRepository.revokeRefreshToken).toHaveBeenCalled();
    });

    it("should throw error if token is expired", async () => {
      const oldToken = "old-refresh-token";
      const mockStoredToken = {
        token: "hashed-old-token",
        isRevoked: false,
        expiresAt: new Date(Date.now() - 10000),
        userId: "user-123",
      };

      (authRepository.findRefreshToken as jest.Mock).mockResolvedValue(mockStoredToken);

      await expect(authService.refresh(oldToken)).rejects.toThrow("Refresh token expired");
    });
  });

  describe("forgotPassword", () => {
    it("should create a reset token and send an email", async () => {
      const email = "test@example.com";
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue({ id: "user-123", email });

      const result = await authService.forgotPassword(email);

      expect(authRepository.createPasswordResetToken).toHaveBeenCalled();
      expect(emailUtils.sendPasswordResetEmail).toHaveBeenCalled();
      expect(result.message).toBe("If email exists, reset link sent");
    });
  });

  describe("upgradeCurrentUserRole", () => {
    it("should upgrade a STUDENT to PROFESSIONAL", async () => {
      const user = { id: "user-123", role: "STUDENT" };
      (authRepository.findUserById as jest.Mock).mockResolvedValue(user);
      (authRepository.updateUserRole as jest.Mock).mockResolvedValue({});
      const getCurrentUserSpy = jest.spyOn(authService, "getCurrentUser").mockResolvedValue({ id: "user-123", role: "PROFESSIONAL" } as any);

      const result = await authService.upgradeCurrentUserRole("user-123", "PROFESSIONAL");

      expect(authRepository.updateUserRole).toHaveBeenCalledWith("user-123", "PROFESSIONAL");
      expect(result.role).toBe("PROFESSIONAL");
      getCurrentUserSpy.mockRestore();
    });

    it("should throw error if user is not STUDENT", async () => {
      const user = { id: "user-123", role: "EMPLOYER" };
      (authRepository.findUserById as jest.Mock).mockResolvedValue(user);

      await expect(authService.upgradeCurrentUserRole("user-123", "PROFESSIONAL")).rejects.toThrow("This account type cannot be changed.");
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
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "emp-123" });

      const result = await authService.registerEmployer(data);

      expect(result.message).toBe("Registration successful. Await admin approval.");
      expect(result.userId).toBe("emp-123");
    });
  });

  describe("logout", () => {
    it("should revoke the refresh token", async () => {
      const token = "refresh-token";
      await authService.logout(token);
      expect(authRepository.revokeRefreshToken).toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("should reset password with valid token", async () => {
      const token = "valid-token";
      const storedToken = { userId: "user-123", expiresAt: new Date(Date.now() + 10000) };
      (authRepository.findPasswordResetToken as jest.Mock).mockResolvedValue(storedToken);
      (bcrypt.hash as jest.Mock).mockResolvedValue("new-hashed-password");

      const result = await authService.resetPassword(token, "NewPassword123!");

      expect(authRepository.updateUserPassword).toHaveBeenCalledWith("user-123", "new-hashed-password");
      expect(authRepository.deletePasswordResetToken).toHaveBeenCalled();
      expect(result.message).toBe("Password reset successful");
    });

    it("should throw error if token is invalid or expired", async () => {
      (authRepository.findPasswordResetToken as jest.Mock).mockResolvedValue(null);
      await expect(authService.resetPassword("invalid", "NewPassword123!")).rejects.toThrow("Invalid or expired token");
    });
  });

  describe("employer management", () => {
    it("should approve an employer", async () => {
      await authService.approveEmployer("emp-123");
      expect(authRepository.approveEmployer).toHaveBeenCalledWith("emp-123");
    });

    it("should reject an employer", async () => {
      await authService.rejectEmployer("emp-123", "Reason");
      expect(authRepository.rejectEmployer).toHaveBeenCalledWith("emp-123", "Reason");
    });
  });
});

