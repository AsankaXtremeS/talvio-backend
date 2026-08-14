"use strict";
// Service layer — business logic for the candidates module.
Object.defineProperty(exports, "__esModule", { value: true });
exports.candidatesService = void 0;
const candidates_repository_1 = require("./candidates.repository");
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = 20;
// ─── Helpers ──────────────────────────────────────────────────────────────────
function toFullName(firstName, lastName) {
    return [firstName, lastName].filter(Boolean).join(" ") || "Unknown";
}
function toAuthProvider(authAccounts) {
    if (authAccounts.length === 0)
        return "LOCAL";
    return authAccounts[0].provider; // GOOGLE, LINKEDIN, or LOCAL
}
function toDTO(user) {
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: toFullName(user.firstName, user.lastName),
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        joinedAt: user.createdAt.toISOString(),
        authProvider: toAuthProvider(user.authAccounts ?? []),
    };
}
// ─── Service ──────────────────────────────────────────────────────────────────
exports.candidatesService = {
    async getCandidateStats() {
        const { undergraduates, professionals } = await candidates_repository_1.candidatesRepository.getStats();
        const total = undergraduates + professionals;
        return {
            lookingForInternships: undergraduates,
            lookingForJobs: professionals,
            internshipApplyingRate: total === 0 ? 0 : Math.round((undergraduates / total) * 100),
            internshipHiringRate: 0,
            jobApplyingRate: total === 0 ? 0 : Math.round((professionals / total) * 100),
            jobHiringRate: 0,
        };
    },
    async getCandidates(options) {
        const page = Math.max(1, options.page ?? 1);
        const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, options.limit ?? DEFAULT_PAGE_LIMIT));
        const search = options.search?.trim() || undefined;
        const { candidates, total } = await candidates_repository_1.candidatesRepository.findAll({
            search,
            role: options.role,
            page,
            limit,
        });
        return {
            data: candidates.map(toDTO),
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
    async getCandidateById(userId) {
        const user = await candidates_repository_1.candidatesRepository.findById(userId);
        if (!user) {
            const err = new Error("Candidate not found");
            err.statusCode = 404;
            throw err;
        }
        return toDTO(user);
    },
    async deleteCandidate(userId) {
        const exists = await candidates_repository_1.candidatesRepository.isCandidate(userId);
        if (!exists) {
            const err = new Error("Candidate not found");
            err.statusCode = 404;
            throw err;
        }
        await candidates_repository_1.candidatesRepository.deleteById(userId);
    },
};
//# sourceMappingURL=candidates.service.js.map