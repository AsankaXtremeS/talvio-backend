"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeResume = exports.updateResume = exports.updateProfile = exports.getProfile = void 0;
const ai_service_1 = require("../../ai/ai.service");
const db_1 = require("../../../config/db");
const candidate_repository_1 = require("../candidate.repository");
/**
 * Get the current candidate's profile
 */
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        const profile = await candidate_repository_1.candidateRepository.findProfileByUserId(userId);
        if (!profile) {
            return res.status(200).json({ profile: null });
        }
        return res.status(200).json({ profile });
    }
    catch (err) {
        console.error("getProfile error:", err);
        return res.status(500).json({ message: err.message });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        const { firstName, lastName, email, headline, location, bio, skills, linkedinUrl, githubUrl, portfolioUrl, profilePictureUrl, } = req.body;
        // Update User table
        await db_1.prisma.user.update({
            where: { id: userId },
            data: {
                ...(firstName !== undefined && { firstName }),
                ...(lastName !== undefined && { lastName }),
                ...(email !== undefined && { email }),
            },
        });
        // Use candidateRepository for upserting profile
        const updatedProfile = await candidate_repository_1.candidateRepository.upsertProfile(userId, {
            headline,
            location,
            bio,
            skills: skills ?? [],
            linkedinUrl,
            githubUrl,
            portfolioUrl,
            profilePictureUrl,
        });
        return res.status(200).json({
            message: "Profile updated successfully",
            profile: updatedProfile,
        });
    }
    catch (err) {
        console.error("updateProfile error:", err);
        return res.status(500).json({ message: err.message });
    }
};
exports.updateProfile = updateProfile;
/**
 * Update candidate's default resume
 */
const updateResume = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        const { cvUrl, cvFileName } = req.body;
        if (!cvUrl)
            return res.status(400).json({ message: "CV URL is required" });
        // 1. Extract Text from PDF
        const cvText = await ai_service_1.aiService.extractCvText(cvUrl);
        // 2. Extract Skills using AI
        const extractedSkills = await ai_service_1.aiService.extractSkills(cvText);
        // 3. Update Profile using candidateRepository
        const updatedProfile = await candidate_repository_1.candidateRepository.upsertProfile(userId, {
            cvUrl,
            cvFileName: cvFileName || "Resume.pdf",
            extractedSkills
        });
        return res.status(200).json({
            message: "Resume updated successfully",
            profile: updatedProfile
        });
    }
    catch (err) {
        console.error("updateResume error:", err);
        return res.status(500).json({ message: err.message });
    }
};
exports.updateResume = updateResume;
/**
 * Remove candidate's default resume
 */
const removeResume = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        const updatedProfile = await candidate_repository_1.candidateRepository.clearResume(userId);
        return res.status(200).json({
            message: "Resume removed successfully",
            profile: updatedProfile
        });
    }
    catch (err) {
        console.error("removeResume error:", err);
        return res.status(500).json({ message: err.message });
    }
};
exports.removeResume = removeResume;
//# sourceMappingURL=profile.controller.js.map