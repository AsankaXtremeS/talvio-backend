import { Request, Response } from "express";
import * as profileController from "../profile.controller";
import { candidateRepository } from "../../candidate.repository";
import { aiService } from "../../../ai/ai.service";
import { prisma } from "../../../../config/db";

// Mock dependencies
jest.mock("../../candidate.repository");
jest.mock("../../../ai/ai.service");
jest.mock("../../../../config/db", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

describe("profileController", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    jest.clearAllMocks();
  });

  describe("getProfile", () => {
    it("should return profile if found", async () => {
      mockReq = { user: { id: "user-123" } as any };
      const mockProfile = { id: "p1", skills: [] };
      (candidateRepository.findProfileByUserId as jest.Mock).mockResolvedValue(mockProfile);

      await profileController.getProfile(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ profile: mockProfile });
    });

    it("should return 401 if user is not authenticated", async () => {
      mockReq = { user: undefined };
      await profileController.getProfile(mockReq as Request, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it("should return null profile if not found", async () => {
      mockReq = { user: { id: "user-123" } as any };
      (candidateRepository.findProfileByUserId as jest.Mock).mockResolvedValue(null);

      await profileController.getProfile(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ profile: null });
    });
  });

  describe("updateProfile", () => {
    it("should update user and profile", async () => {
      mockReq = {
        user: { id: "user-123" } as any,
        body: {
          firstName: "New",
          lastName: "Name",
          headline: "Dev",
        },
      };

      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (candidateRepository.upsertProfile as jest.Mock).mockResolvedValue({ id: "p1", headline: "Dev" });

      await profileController.updateProfile(mockReq as Request, mockRes as Response);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { firstName: "New", lastName: "Name" },
      });
      expect(candidateRepository.upsertProfile).toHaveBeenCalledWith("user-123", { headline: "Dev" });
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Profile updated successfully" }));
    });
  });

  describe("updateResume", () => {
    it("should extract skills and update profile", async () => {
      mockReq = {
        user: { id: "user-123" } as any,
        body: { cvUrl: "http://cv.url", cvFileName: "mycv.pdf" },
      };

      (aiService.extractCvText as jest.Mock).mockResolvedValue("cv text content");
      (aiService.extractSkills as jest.Mock).mockResolvedValue(["React", "Node"]);
      (candidateRepository.upsertProfile as jest.Mock).mockResolvedValue({ id: "p1" });

      await profileController.updateResume(mockReq as Request, mockRes as Response);

      expect(aiService.extractCvText).toHaveBeenCalledWith("http://cv.url");
      expect(aiService.extractSkills).toHaveBeenCalledWith("cv text content");
      expect(candidateRepository.upsertProfile).toHaveBeenCalledWith("user-123", expect.objectContaining({
        extractedSkills: ["React", "Node"]
      }));
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it("should return 400 if cvUrl is missing", async () => {
      mockReq = { user: { id: "user-123" } as any, body: {} };
      await profileController.updateResume(mockReq as Request, mockRes as Response);
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe("removeResume", () => {
    it("should clear resume and return success", async () => {
      mockReq = { user: { id: "user-123" } as any };
      (candidateRepository.clearResume as jest.Mock).mockResolvedValue({ id: "p1", cvUrl: null });

      await profileController.removeResume(mockReq as Request, mockRes as Response);

      expect(candidateRepository.clearResume).toHaveBeenCalledWith("user-123");
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ message: "Resume removed successfully" }));
    });
  });
});
