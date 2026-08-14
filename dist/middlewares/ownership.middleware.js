"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnership = requireOwnership;
// Ensures path-level user id matches the authenticated identity.
function requireOwnership(options = {}) {
    const { paramName = "userId", allowAdmin = true } = options;
    return (req, res, next) => {
        const sessionUser = req.user;
        if (!sessionUser?.id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const targetUserId = req.params?.[paramName];
        if (!targetUserId) {
            return res.status(400).json({ message: `Missing route parameter: ${paramName}` });
        }
        if (allowAdmin && String(sessionUser.role).toUpperCase() === "ADMIN") {
            return next();
        }
        if (targetUserId !== sessionUser.id) {
            return res.status(403).json({ message: "Forbidden: You cannot access another user's data." });
        }
        return next();
    };
}
//# sourceMappingURL=ownership.middleware.js.map