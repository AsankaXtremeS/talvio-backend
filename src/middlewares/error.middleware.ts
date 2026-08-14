// Express error handler middleware for catching and formatting errors.
import { Request, Response, NextFunction } from "express";
import multer from "multer";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);

  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
    }

    return res.status(400).json({ message: err.message || "Invalid file upload." });
  }

  const statusCode = typeof err?.statusCode === "number" ? err.statusCode : 500;
  const message = statusCode >= 500
    ? "Internal Server Error"
    : err?.message || "Request failed";

  return res.status(statusCode).json({ message });
};