"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ai_service_1 = require("../ai.service");
const fs_1 = __importDefault(require("fs"));
const pdf_parse_1 = require("pdf-parse");
// Mock dependencies
jest.mock("@google/generative-ai");
jest.mock("pdf-parse");
jest.mock("fs", () => ({
    promises: {
        readFile: jest.fn(),
    },
}));
// Mock global fetch
global.fetch = jest.fn();
describe("aiService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe("calculateSimilarity", () => {
        it("should return 100 if all required skills are matched", () => {
            const candidateSkills = ["React", "Node.js", "TypeScript"];
            const requiredSkills = ["React", "Node"];
            const score = ai_service_1.aiService.calculateSimilarity(candidateSkills, requiredSkills);
            expect(score).toBe(100);
        });
        it("should return 50 if half of required skills are matched", () => {
            const candidateSkills = ["React", "CSS"];
            const requiredSkills = ["React", "Node"];
            const score = ai_service_1.aiService.calculateSimilarity(candidateSkills, requiredSkills);
            expect(score).toBe(50);
        });
        it("should return 0 if no required skills are matched", () => {
            const candidateSkills = ["Python"];
            const requiredSkills = ["React", "Node"];
            const score = ai_service_1.aiService.calculateSimilarity(candidateSkills, requiredSkills);
            expect(score).toBe(0);
        });
        it("should be case insensitive", () => {
            const candidateSkills = ["react"];
            const requiredSkills = ["REACT"];
            const score = ai_service_1.aiService.calculateSimilarity(candidateSkills, requiredSkills);
            expect(score).toBe(100);
        });
    });
    describe("extractCvText", () => {
        it("should extract text from a local PDF file", async () => {
            const mockBuffer = Buffer.from("mock pdf content");
            fs_1.default.promises.readFile.mockResolvedValue(mockBuffer);
            const mockParsedText = "Extracted Text Content";
            const mockGetText = jest.fn().mockResolvedValue({ text: mockParsedText });
            pdf_parse_1.PDFParse.mockImplementation(() => ({
                getText: mockGetText,
            }));
            const text = await ai_service_1.aiService.extractCvText("path/to/cv.pdf");
            expect(fs_1.default.promises.readFile).toHaveBeenCalledWith("path/to/cv.pdf");
            expect(text).toBe(mockParsedText);
        });
        it("should extract text from a remote PDF URL", async () => {
            const mockArrayBuffer = new ArrayBuffer(8);
            global.fetch.mockResolvedValue({
                ok: true,
                arrayBuffer: jest.fn().mockResolvedValue(mockArrayBuffer),
            });
            const mockParsedText = "Remote Extracted Text";
            const mockGetText = jest.fn().mockResolvedValue({ text: mockParsedText });
            pdf_parse_1.PDFParse.mockImplementation(() => ({
                getText: mockGetText,
            }));
            const text = await ai_service_1.aiService.extractCvText("https://example.com/cv.pdf");
            expect(global.fetch).toHaveBeenCalledWith("https://example.com/cv.pdf");
            expect(text).toBe(mockParsedText);
        });
        it("should throw error if fetch fails", async () => {
            global.fetch.mockResolvedValue({
                ok: false,
                statusText: "Not Found",
            });
            await expect(ai_service_1.aiService.extractCvText("https://example.com/cv.pdf")).rejects.toThrow("Failed to fetch PDF from URL: Not Found");
        });
    });
    describe("analyzeCv", () => {
        // This requires mocking requestWithFallback and providers.
        // For unit tests, we can focus on the fallback logic indirectly by mocking fetch responses.
        it("should return analysis result when provider succeeds", async () => {
            const mockResult = {
                overallScore: 85,
                suggestions: ["Add more keywords"],
                coverLetter: "Dear Hiring Manager...",
            };
            // Mock fetch for OpenAiGenerate (e.g., Mistral)
            global.fetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: JSON.stringify(mockResult) } }],
                }),
            });
            const result = await ai_service_1.aiService.analyzeCv("CV text", "Job description");
            expect(result).toEqual(mockResult);
        });
        it("should handle JSON cleaning if AI returns markdown blocks", async () => {
            const mockResult = { overallScore: 90, suggestions: [], coverLetter: "" };
            const rawResponse = "```json\n" + JSON.stringify(mockResult) + "\n```";
            global.fetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: rawResponse } }],
                }),
            });
            const result = await ai_service_1.aiService.analyzeCv("CV text", "Job description");
            expect(result.overallScore).toBe(90);
        });
    });
    describe("rankJobsWithAI", () => {
        it("should return ranked jobs list", async () => {
            const mockRanked = [
                { id: "1", score: 95 },
                { id: "2", score: 80 }
            ];
            global.fetch.mockResolvedValue({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    choices: [{ message: { content: JSON.stringify(mockRanked) } }],
                }),
            });
            const jobs = [{ id: "1", title: "Job 1" }, { id: "2", title: "Job 2" }];
            const result = await ai_service_1.aiService.rankJobsWithAI({ skills: ["React"] }, jobs);
            expect(result).toEqual(mockRanked);
        });
        it("should return empty array if no jobs provided", async () => {
            const result = await ai_service_1.aiService.rankJobsWithAI({}, []);
            expect(result).toEqual([]);
        });
    });
});
//# sourceMappingURL=ai.service.spec.js.map