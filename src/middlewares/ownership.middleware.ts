import { Request, Response, NextFunction } from "express";

interface OwnershipOptions {
  paramName?: string;
  allowAdmin?: boolean;
}

// Ensures path-level user id matches the authenticated identity.
export function requireOwnership(options: OwnershipOptions = {}) {
  const { paramName = "userId", allowAdmin = true } = options;

  return (req: Request, res: Response, next: NextFunction) => {
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
