/**
 * auth.service.extended.spec.ts
 *
 * Additional unit tests for authService — focusing on:
 *   1. PROFESSIONAL user registration (your responsibility)
 *   2. STUDENT user registration edge cases
 *   3. Login edge cases for STUDENT and PROFESSIONAL
 *   4. Rejected employer login path
 *   5. Non-existent user login
 *   6. Email normalisation (whitespace / casing)
 *   7. Token revocation state checks (refresh)
 *   8. forgotPassword when email does NOT exist (silent response)
 *   9. upgradeCurrentUserRole — already-PROFESSIONAL guard
 *  10. registerEmployer — missing PDF guard
 *
 * These tests complement the existing auth.service.spec.ts without
 * duplicating any of its cases.
 */

import { authService } from "../auth.service";
import { authRepository } from "../auth.repository";
import bcrypt from "bcrypt";
import * as jwtUtils from "../../../utils/jwt";
import * as emailUtils from "../../../utils/email";

// ─── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("../auth.repository");
jest.mock("bcrypt");
jest.mock("../../../utils/jwt");
jest.mock("../../../utils/email");
jest.mock("../../../config/db", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a minimal mock user object that passes buildSessionUser safely */
const mockStudent = {
  id: "student-001",
  email: "student@example.com",
  password: "hashedPassword",
  role: "STUDENT",
  firstName: "Alice",
  lastName: "Smith",
  employerProfile: null,
  candidateProfile: null,
};

const mockProfessional = {
  ...mockStudent,
  id: "prof-001",
  email: "professional@example.com",
  role: "PROFESSIONAL",
};

// ─────────────────────────────────────────────────────────────────────────────

describe("authService — extended tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════
  // 1. registerUser — PROFESSIONAL role
  // ══════════════════════════════════════════════════════════════════
  describe("registerUser — PROFESSIONAL path", () => {
    const professionalData = {
      email: "professional@example.com",
      password: "SecurePass1!",
      firstName: "Jane",
      lastName: "Doe",
      role: "PROFESSIONAL",
    };

    it("should successfully register a PROFESSIONAL user", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");
      (authRepository.createUser as jest.Mock).mockResolvedValue({
        id: "prof-001",
        role: "PROFESSIONAL",
      });
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("access-token");
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("refresh-token");
      (authRepository.createRefreshToken as jest.Mock).mockResolvedValue({});

      // Act
      const result = await authService.registerUser(professionalData);

      // Assert — createUser must be called with the correct role
      expect(authRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: "PROFESSIONAL" })
      );
      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });
    });

    it("should hash the password with bcrypt salt rounds = 10", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashedPassword");
      (authRepository.createUser as jest.Mock).mockResolvedValue({
        id: "prof-001",
        role: "PROFESSIONAL",
      });
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("token");
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("rtoken");
      (authRepository.createRefreshToken as jest.Mock).mockResolvedValue({});

      // Act
      await authService.registerUser(professionalData);

      // Assert — password must be hashed, never stored in plain text
      expect(bcrypt.hash).toHaveBeenCalledWith("SecurePass1!", 10);
    });

    it("should throw if a PROFESSIONAL email already exists", async () => {
      // Arrange — simulate duplicate email
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue({
        id: "existing-user",
      });

      // Act & Assert
      await expect(authService.registerUser(professionalData)).rejects.toThrow(
        "User already exists"
      );

      // createUser must NOT be called
      expect(authRepository.createUser).not.toHaveBeenCalled();
    });

    it("should normalise email to lowercase before checking duplicates", async () => {
      // Arrange
      const mixedCaseData = {
        ...professionalData,
        email: "  Professional@EXAMPLE.COM  ",
      };
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      (authRepository.createUser as jest.Mock).mockResolvedValue({
        id: "prof-002",
        role: "PROFESSIONAL",
      });
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("t");
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("r");
      (authRepository.createRefreshToken as jest.Mock).mockResolvedValue({});

      // Act
      await authService.registerUser(mixedCaseData);

      // Assert — the repository must receive a normalised email
      expect(authRepository.findUserByEmail).toHaveBeenCalledWith(
        "professional@example.com"
      );
    });

    it("should reject EMPLOYER role attempted via registerUser", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
      const employerAttempt = { ...professionalData, role: "EMPLOYER" };

      // Act & Assert
      await expect(authService.registerUser(employerAttempt)).rejects.toThrow(
        "Invalid role. Only STUDENT or PROFESSIONAL registration allowed."
      );
    });

    it("should reject lowercase role strings (e.g. 'professional') gracefully", async () => {
      // Arrange — role as lowercase; service must uppercase it internally
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      (authRepository.createUser as jest.Mock).mockResolvedValue({
        id: "prof-003",
        role: "PROFESSIONAL",
      });
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("t");
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("r");
      (authRepository.createRefreshToken as jest.Mock).mockResolvedValue({});

      const lowercaseRole = { ...professionalData, role: "professional" };

      // Act — should not throw; service internally uppercases the role
      await expect(authService.registerUser(lowercaseRole)).resolves.toBeDefined();

      // createUser must receive the uppercased role
      expect(authRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ role: "PROFESSIONAL" })
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 2. registerUser — STUDENT path edge cases
  // ══════════════════════════════════════════════════════════════════
  describe("registerUser — STUDENT edge cases", () => {
    it("should issue both access and refresh tokens on successful STUDENT registration", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      (authRepository.createUser as jest.Mock).mockResolvedValue({
        id: "stu-001",
        role: "STUDENT",
      });
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("stu-access");
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("stu-refresh");
      (authRepository.createRefreshToken as jest.Mock).mockResolvedValue({});

      // Act
      const result = await authService.registerUser({
        email: "student@example.com",
        password: "pass123",
        firstName: "Bob",
        lastName: "Builder",
        role: "STUDENT",
      });

      // Assert — both tokens must be present in the response
      expect(result.accessToken).toBe("stu-access");
      expect(result.refreshToken).toBe("stu-refresh");
    });

    it("should store hashed token in DB, not the raw refresh token", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
      (authRepository.createUser as jest.Mock).mockResolvedValue({
        id: "stu-002",
        role: "STUDENT",
      });
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("t");
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("raw-refresh");
      (authRepository.createRefreshToken as jest.Mock).mockResolvedValue({});

      // Act
      await authService.registerUser({
        email: "new@example.com",
        password: "pass123",
        firstName: "Eve",
        lastName: "Adams",
        role: "STUDENT",
      });

      // Assert — createRefreshToken must NOT receive the raw token string
      const callArg = (authRepository.createRefreshToken as jest.Mock).mock.calls[0][0];
      expect(callArg.token).not.toBe("raw-refresh");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 3. login — STUDENT and PROFESSIONAL
  // ══════════════════════════════════════════════════════════════════
  describe("login — STUDENT and PROFESSIONAL", () => {
    it("should successfully log in a PROFESSIONAL user", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockProfessional);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("prof-access");
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("prof-refresh");
      (authRepository.createRefreshToken as jest.Mock).mockResolvedValue({});

      // Act
      const result = await authService.login({
        email: "professional@example.com",
        password: "SecurePass1!",
      });

      // Assert
      expect(result.accessToken).toBe("prof-access");
      expect(result.user.role).toBe("PROFESSIONAL");
      expect(result.user.email).toBe("professional@example.com");
    });

    it("should throw 'Invalid credentials' when user does not exist", async () => {
      // Arrange — user not found in DB
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.login({ email: "ghost@example.com", password: "any" })
      ).rejects.toThrow("Invalid credentials");
    });

    it("should throw 'Invalid credentials' when password is wrong", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockStudent);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.login({ email: "student@example.com", password: "wrongpass" })
      ).rejects.toThrow("Invalid credentials");
    });

    it("should return user session shape with firstName and lastName for STUDENT", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockStudent);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("t");
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("r");
      (authRepository.createRefreshToken as jest.Mock).mockResolvedValue({});

      // Act
      const result = await authService.login({
        email: "student@example.com",
        password: "pass",
      });

      // Assert — session user must include name fields
      expect(result.user.firstName).toBe("Alice");
      expect(result.user.lastName).toBe("Smith");
    });

    it("should include permissions array in login response", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(mockProfessional);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateAccessToken as jest.Mock).mockReturnValue("t");
      (jwtUtils.generateRefreshToken as jest.Mock).mockReturnValue("r");
      (authRepository.createRefreshToken as jest.Mock).mockResolvedValue({});

      // Act
      const result = await authService.login({
        email: "professional@example.com",
        password: "pass",
      });

      // Assert — permissions must match role
      expect(result.user.permissions).toContain("PROFESSIONAL");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 4. login — rejected employer
  // ══════════════════════════════════════════════════════════════════
  describe("login — rejected employer", () => {
    it("should throw rejection reason when employer is REJECTED", async () => {
      // Arrange
      const rejectedEmployer = {
        ...mockStudent,
        role: "EMPLOYER",
        employerProfile: {
          verificationStatus: "REJECTED",
          rejectionReason: "Documents could not be verified.",
        },
      };
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(rejectedEmployer);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert — rejection reason must appear in error message
      await expect(
        authService.login({ email: "employer@example.com", password: "pass" })
      ).rejects.toThrow("Documents could not be verified.");
    });

    it("should throw generic rejection message when no reason is provided", async () => {
      // Arrange
      const rejectedEmployer = {
        ...mockStudent,
        role: "EMPLOYER",
        employerProfile: {
          verificationStatus: "REJECTED",
          rejectionReason: null,
        },
      };
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(rejectedEmployer);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.login({ email: "employer@example.com", password: "pass" })
      ).rejects.toThrow("Employer account was rejected by admin.");
    });

    it("should throw 'Employer profile missing' when employer has no profile", async () => {
      // Arrange
      const brokenEmployer = {
        ...mockStudent,
        role: "EMPLOYER",
        employerProfile: null,
      };
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(brokenEmployer);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act & Assert
      await expect(
        authService.login({ email: "broken@example.com", password: "pass" })
      ).rejects.toThrow("Employer profile missing");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 5. refresh — revoked token guard
  // ══════════════════════════════════════════════════════════════════
  describe("refresh — revoked token guard", () => {
    it("should throw 'Invalid refresh token' when token is revoked", async () => {
      // Arrange
      const revokedToken = {
        token: "hashed-token",
        isRevoked: true,
        expiresAt: new Date(Date.now() + 10000),
        userId: "user-123",
      };
      (authRepository.findRefreshToken as jest.Mock).mockResolvedValue(revokedToken);

      // Act & Assert
      await expect(authService.refresh("some-token")).rejects.toThrow(
        "Invalid refresh token"
      );
    });

    it("should throw 'Invalid refresh token' when token record not found", async () => {
      // Arrange — token not in DB at all
      (authRepository.findRefreshToken as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(authService.refresh("nonexistent-token")).rejects.toThrow(
        "Invalid refresh token"
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 6. forgotPassword — silent response for unknown email
  // ══════════════════════════════════════════════════════════════════
  describe("forgotPassword — email not found", () => {
    it("should return silent success message when email does not exist", async () => {
      // Arrange — user not found (we never reveal whether email exists)
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await authService.forgotPassword("unknown@example.com");

      // Assert — must NOT throw; must return the same message as success path
      expect(result.message).toBe("If email exists, reset link sent");

      // Assert — must NOT create a token or send an email
      expect(authRepository.createPasswordResetToken).not.toHaveBeenCalled();
      expect(emailUtils.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it("should invalidate old reset tokens before creating a new one", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue({
        id: "user-123",
        email: "user@example.com",
      });

      // Act
      await authService.forgotPassword("user@example.com");

      // Assert — old tokens must be cleared first
      expect(authRepository.deleteOldPasswordResetTokens).toHaveBeenCalledWith("user-123");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 7. upgradeCurrentUserRole — already PROFESSIONAL guard
  // ══════════════════════════════════════════════════════════════════
  describe("upgradeCurrentUserRole — already PROFESSIONAL", () => {
    it("should return current user without updating role if already PROFESSIONAL", async () => {
      // Arrange — user is already PROFESSIONAL
      const alreadyProfessional = { id: "user-123", role: "PROFESSIONAL" };
      (authRepository.findUserById as jest.Mock).mockResolvedValue(alreadyProfessional);
      const spy = jest
        .spyOn(authService, "getCurrentUser")
        .mockResolvedValue({ id: "user-123", role: "PROFESSIONAL" } as any);

      // Act
      const result = await authService.upgradeCurrentUserRole("user-123", "PROFESSIONAL");

      // Assert — no DB write should occur
      expect(authRepository.updateUserRole).not.toHaveBeenCalled();
      expect(result.role).toBe("PROFESSIONAL");
      spy.mockRestore();
    });

    it("should throw when ADMIN tries to upgrade role", async () => {
      // Arrange
      const adminUser = { id: "admin-001", role: "ADMIN" };
      (authRepository.findUserById as jest.Mock).mockResolvedValue(adminUser);

      // Act & Assert
      await expect(
        authService.upgradeCurrentUserRole("admin-001", "PROFESSIONAL")
      ).rejects.toThrow("This account type cannot be changed.");
    });

    it("should throw when user is not found", async () => {
      // Arrange
      (authRepository.findUserById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.upgradeCurrentUserRole("ghost-id", "PROFESSIONAL")
      ).rejects.toThrow("User not found");
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 8. registerEmployer — missing PDF guard
  // ══════════════════════════════════════════════════════════════════
  describe("registerEmployer — validation", () => {
    it("should throw when registration PDF URL is missing", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);

      // Act & Assert — PDF is required for employer verification
      await expect(
        authService.registerEmployer({
          email: "emp@example.com",
          password: "pass123",
          companyName: "Corp",
          registrationFileUrl: "",         // empty = invalid
          registrationFileName: "file.pdf",
        })
      ).rejects.toThrow("Business registration PDF is required");
    });

    it("should throw when registration PDF filename is missing", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        authService.registerEmployer({
          email: "emp@example.com",
          password: "pass123",
          companyName: "Corp",
          registrationFileUrl: "https://cdn.example.com/file.pdf",
          registrationFileName: "",        // empty = invalid
        })
      ).rejects.toThrow("Business registration PDF is required");
    });

    it("should throw if employer email already exists", async () => {
      // Arrange
      (authRepository.findUserByEmail as jest.Mock).mockResolvedValue({ id: "existing" });

      // Act & Assert
      await expect(
        authService.registerEmployer({
          email: "existing@example.com",
          password: "pass123",
          companyName: "Corp",
          registrationFileUrl: "url",
          registrationFileName: "file.pdf",
        })
      ).rejects.toThrow("User already exists");
    });
  });
});