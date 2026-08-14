// Middleware to authenticate requests using Bearer JWT access tokens.
import { Request, Response, NextFunction } from "express"
import { verifyAccessToken } from "../utils/jwt"

const toAuthenticatedUser = (decoded: unknown): Express.User | undefined => {
  if (!decoded || typeof decoded !== "object") return undefined;

  const payload = decoded as Record<string, unknown>;
  const id =
    typeof payload.userId === "string"
      ? payload.userId
      : typeof payload.id === "string"
        ? payload.id
        : undefined;
  const role = typeof payload.role === "string" ? payload.role : undefined;

  if (!id || !role) return undefined;

  return {
    id,
    role: role as Express.User["role"],
  };
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;

  const bearerToken = header && header.startsWith("Bearer ") ? header.split(" ")[1] : undefined;
  const cookieToken = req.cookies?.accessToken as string | undefined;

  const tokenCandidates = [bearerToken, cookieToken].filter(Boolean) as string[];
  if (tokenCandidates.length === 0) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  for (const token of tokenCandidates) {
    try {
      const decoded = verifyAccessToken(token);
      const user = toAuthenticatedUser(decoded);
      if (!user) {
        continue;
      }

      req.user = user;
      return next();
    } catch (err) {
      // Log token verification errors for debugging
      console.error(`Token verification failed:`, (err as Error).message);
      // Try next token candidate.
    }
  }

  console.error(`All token verification attempts failed. Bearer: ${!!bearerToken}, Cookie: ${!!cookieToken}`);
  return res.status(401).json({ message: "Invalid token" });
};
