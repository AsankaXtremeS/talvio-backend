import { Request, Response } from "express";
import { aiService } from "../../ai/ai.service";
import { prisma } from "../../../config/db";
import { candidateRepository } from "../candidate.repository";

/**
 * Get the current candidate's profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const profile = await candidateRepository.findProfileByUserId(userId);
    if (!profile) {
      return res.status(200).json({ profile: null });
    }

    return res.status(200).json({ profile });
  } catch (err: any) {
    console.error("getProfile error:", err);
    return res.status(500).json({ message: err.message });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      firstName,
      lastName,
      email,
      headline,
      location,
      bio,
      skills,
      linkedinUrl,
      githubUrl,
      portfolioUrl,
      profilePictureUrl,
    } = req.body;

    // Update User table only if relevant fields are provided
    const userUpdateData: any = {};
    if (firstName !== undefined) userUpdateData.firstName = firstName;
    if (lastName !== undefined) userUpdateData.lastName = lastName;
    if (email !== undefined) userUpdateData.email = email;

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    // Use candidateRepository for upserting profile
    const profileUpdateData: any = {
      ...(headline !== undefined && { headline }),
      ...(location !== undefined && { location }),
      ...(bio !== undefined && { bio }),
      ...(skills !== undefined && { skills }),
      ...(linkedinUrl !== undefined && { linkedinUrl }),
      ...(githubUrl !== undefined && { githubUrl }),
      ...(portfolioUrl !== undefined && { portfolioUrl }),
      ...(profilePictureUrl !== undefined && { profilePictureUrl }),
    };

    const updatedProfile = await candidateRepository.upsertProfile(userId, profileUpdateData);

    return res.status(200).json({
      message: "Profile updated successfully",
      profile: updatedProfile,
    });
  } catch (err: any) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/**
 * Update candidate's default resume
 */
export const updateResume = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { cvUrl, cvFileName } = req.body as { cvUrl: string; cvFileName: string };
    if (!cvUrl) return res.status(400).json({ message: "CV URL is required" });

    // 1. Extract Text from PDF
    let extractedSkills: string[] = [];
    try {
      const cvText = await aiService.extractCvText(cvUrl);
      // 2. Extract Skills using AI
      extractedSkills = await aiService.extractSkills(cvText);
    } catch (aiErr) {
      console.warn("AI skill extraction failed during resume upload:", aiErr);
      // Proceed without failing the resume upload
    }

    // 3. Update Profile using candidateRepository
    const updatedProfile = await candidateRepository.upsertProfile(userId, {
      cvUrl,
      cvFileName: cvFileName || "Resume.pdf",
      extractedSkills
    });

    return res.status(200).json({
      message: "Resume updated successfully",
      profile: updatedProfile
    });
  } catch (err: any) {
    console.error("updateResume error:", err);
    return res.status(500).json({ message: "Failed to update resume. Please try again." });
  }
};

/**
 * Remove candidate's default resume
 */
export const removeResume = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const updatedProfile = await candidateRepository.clearResume(userId);

    return res.status(200).json({
      message: "Resume removed successfully",
      profile: updatedProfile
    });
  } catch (err: any) {
    console.error("removeResume error:", err);
    return res.status(500).json({ message: err.message });
  }
};