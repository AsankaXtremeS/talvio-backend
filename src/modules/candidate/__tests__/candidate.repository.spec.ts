import { candidateRepository } from "../candidate.repository";
import { prisma } from "../../../config/db";

// Mock prisma
jest.mock("../../../config/db", () => ({
  prisma: {
    candidateProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("candidateRepository", () => {
  const mockUserId = "user-123";
  const mockProfile = {
    id: "profile-123",
    userId: mockUserId,
    skills: ["React", "TypeScript"],
    bio: "Bio text",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findProfileByUserId", () => {
    it("should call prisma.findUnique with correct params", async () => {
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);

      const result = await candidateRepository.findProfileByUserId(mockUserId);

      expect(prisma.candidateProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(result).toEqual(mockProfile);
    });
  });

  describe("upsertProfile", () => {
    it("should call prisma.upsert with correct data", async () => {
      const updateData = { bio: "Updated bio", skills: ["Node"] };
      (prisma.candidateProfile.upsert as jest.Mock).mockResolvedValue({ ...mockProfile, ...updateData });

      const result = await candidateRepository.upsertProfile(mockUserId, updateData);

      expect(prisma.candidateProfile.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        create: {
          userId: mockUserId,
          ...updateData,
        },
        update: updateData,
      });
      expect(result.bio).toBe("Updated bio");
    });
  });

  describe("clearResume", () => {
    it("should call prisma.update with null values for resume fields", async () => {
      (prisma.candidateProfile.update as jest.Mock).mockResolvedValue({ ...mockProfile, cvUrl: null });

      await candidateRepository.clearResume(mockUserId);

      expect(prisma.candidateProfile.update).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: expect.objectContaining({
          cvUrl: null,
          cvFileName: null,
          extractedSkills: [],
        }),
      });
    });
  });
});
