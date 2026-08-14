// Middleware to restrict access to users with specific roles (e.g., ADMIN).

import { Request, Response, NextFunction } from "express";

export function requireRole(role: string | string[]) {
	return (req: Request, res: Response, next: NextFunction) => {
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
