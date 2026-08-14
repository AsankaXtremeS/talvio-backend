"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateResetPassword = exports.validateLogin = exports.validateRegisterEmployer = exports.validateRegisterUser = void 0;
// Validation functions for registration and login requests.
const validator_1 = __importDefault(require("validator"));
const validateRegisterUser = (data) => {
    if (!data.email || !data.password || !data.confirmPassword || !data.role) {
        throw new Error("Missing required fields");
    }
    if (!validator_1.default.isEmail(data.email)) {
        throw new Error("Invalid email format");
    }
    if (data.password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(data.password) || !/[0-9]/.test(data.password)) {
        throw new Error("Password must contain at least one uppercase letter and one number");
    }
    if (data.password !== data.confirmPassword) {
        throw new Error("Passwords do not match");
    }
};
exports.validateRegisterUser = validateRegisterUser;
const validateRegisterEmployer = (data) => {
    if (!data.email ||
        !data.password ||
        !data.confirmPassword ||
        !data.companyName ||
        !data.registrationFileUrl) {
        throw new Error("Missing employer fields");
    }
    if (!validator_1.default.isEmail(data.email)) {
        throw new Error("Invalid email format");
    }
    if (data.password.length < 8) {
        throw new Error("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(data.password) || !/[0-9]/.test(data.password)) {
        throw new Error("Password must contain at least one uppercase letter and one number");
    }
    if (data.password !== data.confirmPassword) {
        throw new Error("Passwords do not match");
    }
};
exports.validateRegisterEmployer = validateRegisterEmployer;
const validateLogin = (data) => {
    if (!data.email || !data.password) {
        throw new Error("Email and password required");
    }
    const normalizedEmail = String(data.email).trim().toLowerCase();
    if (!validator_1.default.isEmail(normalizedEmail)) {
        throw new Error("Invalid email format");
    }
    data.email = normalizedEmail;
};
exports.validateLogin = validateLogin;
const validateResetPassword = (newPassword) => {
    if (!newPassword || newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters long");
    }
    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
        throw new Error("Password must contain at least one uppercase letter and one number");
    }
};
exports.validateResetPassword = validateResetPassword;
//# sourceMappingURL=auth.validation.js.map