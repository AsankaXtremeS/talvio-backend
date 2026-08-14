"use strict";
// Middleware to restrict access to users with specific roles (e.g., ADMIN).
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(403).json({ message: "Forbidden: Insufficient role" });
        }
        const userRole = String(req.user.role).toUpperCase();
        const allowedRoles = Array.isArray(role) ? role.map(r => r.toUpperCase()) : [role.toUpperCase()];
        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message: "Forbidden: Insufficient role" });
        }
        next();
    };
}
//# sourceMappingURL=role.middleware.js.map