"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jwt_1 = require("../utils/jwt");
const toAuthenticatedUser = (decoded) => {
    if (!decoded || typeof decoded !== "object")
        return undefined;
    const payload = decoded;
    const id = typeof payload.userId === "string"
        ? payload.userId
        : typeof payload.id === "string"
            ? payload.id
            : undefined;
    const role = typeof payload.role === "string" ? payload.role : undefined;
    if (!id || !role)
        return undefined;
    return {
        id,
        role: role,
    };
};
const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    const bearerToken = header && header.startsWith("Bearer ") ? header.split(" ")[1] : undefined;
    const cookieToken = req.cookies?.accessToken;
    const tokenCandidates = [bearerToken, cookieToken].filter(Boolean);
    if (tokenCandidates.length === 0) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    for (const token of tokenCandidates) {
        try {
            const decoded = (0, jwt_1.verifyAccessToken)(token);
            const user = toAuthenticatedUser(decoded);
            if (!user) {
                continue;
            }
            req.user = user;
            return next();
        }
        catch (err) {
            // Log token verification errors for debugging
            console.error(`Token verification failed:`, err.message);
            // Try next token candidate.
        }
    }
    console.error(`All token verification attempts failed. Bearer: ${!!bearerToken}, Cookie: ${!!cookieToken}`);
    return res.status(401).json({ message: "Invalid token" });
};
exports.authenticate = authenticate;
//# sourceMappingURL=auth.middleware.js.map