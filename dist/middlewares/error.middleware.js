"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const multer_1 = __importDefault(require("multer"));
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    if (err instanceof multer_1.default.MulterError) {
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
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map