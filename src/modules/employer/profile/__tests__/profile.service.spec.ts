/**
 * profile.service.spec.ts
 *
 * Unit tests for the employer profileService — covering:
 *   1. getProfile  — happy path, not-found error
 *   2. updateProfile — happy path, not-approved guard, not-found guard
 *   3. disconnectCalendar — clears tokens and sets connected flag to false
 *   4. getCalendarAuthUrl — missing env guard
 *   5. DTO shape — ensuring mapToDTO produces the correct structure
 *
 * All DB access is mocked via profileRepository.
 * Google OAuth2 calls are mocked at the module level.
 */

import { profileService } from "../profile.service";
import { profileRepository } from "../profile.repository";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Prevent Prisma from initialising (it requires `prisma generate` and a live DB)
jest.mock("../../../../config/db", () => ({
  prisma: {
    employerProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("../profile.repository");

// Mock the googleapis module so no real HTTP calls are made
jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn().mockReturnValue("https://accounts.google.com/auth"),
        getToken: jest.fn().mockResolvedValue({
          tokens: {
            access_token: "google-access",
            refresh_token: "google-refresh",
            expiry_date: 9999999999999,
          },
        }),
      })),
    },
  },
}));

// ─── Shared fixtures ──────────────────────────────────────────────────────────

/**
 * A minimal raw DB profile row as Prisma would return it.
 * Use spread to build test-specific variations.
 */
const baseProfile = {
  id: "profile-001",
  userId: "user-001",
  companyName: "Talvio Corp",
  companyDescription: "A great company",
  companyWebsite: "https://talvio.com",
  companyLocation: "Colombo, Sri Lanka",
  companyLogoUrl: "https://cdn.example.com/logo.png",
  coverImageUrl: "https://cdn.example.com/cover.png",
  industry: "Software Development",
  companyType: "Private",
  companySize: "51-200",
  foundedYear: 2018,
  specialties: "Cloud, AI/ML",
  linkedInUrl: "https://linkedin.com/company/talvio",
  facebookUrl: null,
  twitterUrl: null,
  registrationFileUrl: "https://cdn.example.com/reg.pdf",
  registrationFileName: "registration.pdf",
  verificationStatus: "APPROVED",
  rejectionReason: null,
  googleCalendarConnected: false,
  googleAccessToken: null,
  googleRefreshToken: null,
  googleTokenExpiry: null,
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-06-01T00:00:00Z"),
  user: {
    id: "user-001",
    email: "employer@talvio.com",
    firstName: "Mark",
    lastName: "Johnson",
  },
};

// ─────────────────────────────────────────────────────────────────────────────

describe("profileService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ══════════════════════════════════════════════════════════════════
  // 1. getProfile
  // ══════════════════════════════════════════════════════════════════
  describe("getProfile", () => {
    it("should return a correctly shaped DTO for an approved employer", async () => {
      // Arrange
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(baseProfile);

      // Act
      const dto = await profileService.getProfile("user-001");

      // Assert — key fields from the DB row must appear in the DTO
      expect(dto.companyName).toBe("Talvio Corp");
      expect(dto.companyWebsite).toBe("https://talvio.com");
      expect(dto.verificationStatus).toBe("APPROVED");
      expect(dto.googleCalendarConnected).toBe(false);
    });

    it("should include user details nested inside the DTO", async () => {
      // Arrange
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(baseProfile);

      // Act
      const dto = await profileService.getProfile("user-001");

      // Assert — user sub-object must be present
      expect(dto.user.email).toBe("employer@talvio.com");
      expect(dto.user.firstName).toBe("Mark");
    });

    it("should return ISO strings for createdAt and updatedAt", async () => {
      // Arrange
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(baseProfile);

      // Act
      const dto = await profileService.getProfile("user-001");

      // Assert — dates must be serialised as ISO strings (safe for JSON)
      expect(typeof dto.createdAt).toBe("string");
      expect(typeof dto.updatedAt).toBe("string");
      expect(dto.createdAt).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should return null for optional fields that are not set", async () => {
      // Arrange — profile without optional fields
      const sparseProfile = {
        ...baseProfile,
        companyDescription: null,
        companyWebsite: null,
        linkedInUrl: null,
        facebookUrl: null,
        twitterUrl: null,
      };
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(sparseProfile);

      // Act
      const dto = await profileService.getProfile("user-001");

      // Assert — optional fields must be null, not undefined
      expect(dto.companyDescription).toBeNull();
      expect(dto.linkedInUrl).toBeNull();
    });

    it("should throw 404 error when profile does not exist", async () => {
      // Arrange — no record in DB
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(profileService.getProfile("ghost-user")).rejects.toMatchObject({
        message: "Employer profile not found.",
        statusCode: 404,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 2. updateProfile
  // ══════════════════════════════════════════════════════════════════
  describe("updateProfile", () => {
    const updatePayload = {
      companyName: "Talvio 2.0",
      companyDescription: "Updated description",
      companyWebsite: "https://talvio2.com",
      companyLocation: "Kandy, Sri Lanka",
    };

    it("should update and return the updated profile DTO", async () => {
      // Arrange
      const updatedProfile = {
        ...baseProfile,
        companyName: "Talvio 2.0",
        companyDescription: "Updated description",
        updatedAt: new Date("2024-12-01T00:00:00Z"),
      };
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(baseProfile);
      (profileRepository.updateByUserId as jest.Mock).mockResolvedValue(updatedProfile);

      // Act
      const dto = await profileService.updateProfile("user-001", updatePayload as any);

      // Assert
      expect(dto.companyName).toBe("Talvio 2.0");
      expect(profileRepository.updateByUserId).toHaveBeenCalledWith(
        "user-001",
        updatePayload
      );
    });

    it("should throw 403 when employer is PENDING and tries to update", async () => {
      // Arrange — employer not yet approved
      const pendingProfile = {
        ...baseProfile,
        verificationStatus: "PENDING",
      };
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(pendingProfile);

      // Act & Assert
      await expect(
        profileService.updateProfile("user-001", updatePayload as any)
      ).rejects.toMatchObject({
        message: "Only approved employers can update their profile.",
        statusCode: 403,
      });

      // Repository write must NOT be called
      expect(profileRepository.updateByUserId).not.toHaveBeenCalled();
    });

    it("should throw 403 when employer is REJECTED and tries to update", async () => {
      // Arrange
      const rejectedProfile = {
        ...baseProfile,
        verificationStatus: "REJECTED",
        rejectionReason: "Invalid documents",
      };
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(rejectedProfile);

      // Act & Assert
      await expect(
        profileService.updateProfile("user-001", updatePayload as any)
      ).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it("should throw 404 when updating a non-existent profile", async () => {
      // Arrange
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        profileService.updateProfile("ghost-user", updatePayload as any)
      ).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 3. disconnectCalendar
  // ══════════════════════════════════════════════════════════════════
  describe("disconnectCalendar", () => {
    it("should clear Google tokens and set connected flag to false", async () => {
      // Arrange — profile that has a connected calendar
      const connectedProfile = {
        ...baseProfile,
        googleCalendarConnected: true,
        googleAccessToken: "old-access",
        googleRefreshToken: "old-refresh",
      };
      // The repository returns the profile after the update
      const disconnectedProfile = {
        ...baseProfile,
        googleCalendarConnected: false,
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      };
      (profileRepository.updateGoogleTokensByUserId as jest.Mock).mockResolvedValue(
        disconnectedProfile
      );

      // Act
      const dto = await profileService.disconnectCalendar("user-001");

      // Assert — tokens must be cleared in the repository call
      expect(profileRepository.updateGoogleTokensByUserId).toHaveBeenCalledWith(
        "user-001",
        expect.objectContaining({
          googleAccessToken: null,
          googleRefreshToken: null,
          googleTokenExpiry: null,
          googleCalendarConnected: false,
        })
      );

      // Assert — returned DTO must reflect disconnected state
      expect(dto.googleCalendarConnected).toBe(false);
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 4. getCalendarAuthUrl — missing env guard
  // ══════════════════════════════════════════════════════════════════
  describe("getCalendarAuthUrl", () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
      // Restore env before each test so we can selectively delete keys
      process.env = { ...ORIGINAL_ENV };
    });

    afterEach(() => {
      process.env = ORIGINAL_ENV;
    });

    it("should throw 500 when GOOGLE_CLIENT_ID is missing from env", async () => {
      // Arrange — simulate missing env var
      delete process.env.GOOGLE_CLIENT_ID;

      // Act & Assert
      await expect(profileService.getCalendarAuthUrl()).rejects.toMatchObject({
        statusCode: 500,
        message: expect.stringContaining("Google OAuth2 configuration is missing"),
      });
    });

    it("should throw 500 when GOOGLE_CLIENT_SECRET is missing from env", async () => {
      // Arrange
      process.env.GOOGLE_CLIENT_ID = "client-id";
      delete process.env.GOOGLE_CLIENT_SECRET;

      // Act & Assert
      await expect(profileService.getCalendarAuthUrl()).rejects.toMatchObject({
        statusCode: 500,
      });
    });
  });

  // ══════════════════════════════════════════════════════════════════
  // 5. DTO shape — mapToDTO correctness
  // ══════════════════════════════════════════════════════════════════
  describe("DTO shape", () => {
    it("should expose registrationFileUrl in the DTO (needed for admin view)", async () => {
      // Arrange
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(baseProfile);

      // Act
      const dto = await profileService.getProfile("user-001");

      // Assert — admin needs this to verify the business registration document
      expect(dto.registrationFileUrl).toBe("https://cdn.example.com/reg.pdf");
      expect(dto.registrationFileName).toBe("registration.pdf");
    });

    it("should not expose raw Google OAuth tokens in the DTO", async () => {
      // Arrange — profile with tokens stored
      const profileWithTokens = {
        ...baseProfile,
        googleCalendarConnected: true,
        googleAccessToken: "secret-google-access",
        googleRefreshToken: "secret-google-refresh",
      };
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(profileWithTokens);

      // Act
      const dto = await profileService.getProfile("user-001");

      // Assert — raw tokens must never leave the service layer
      expect((dto as any).googleAccessToken).toBeUndefined();
      expect((dto as any).googleRefreshToken).toBeUndefined();
      // Only the boolean flag is exposed
      expect(dto.googleCalendarConnected).toBe(true);
    });

    it("should convert null foundedYear to null in DTO (not 0 or undefined)", async () => {
      // Arrange
      const profileNoYear = { ...baseProfile, foundedYear: null };
      (profileRepository.findByUserId as jest.Mock).mockResolvedValue(profileNoYear);

      // Act
      const dto = await profileService.getProfile("user-001");

      // Assert
      expect(dto.foundedYear).toBeNull();
    });
  });
});