// Validation functions for registration and login requests.
import validator from "validator";

export const validateRegisterUser = (data: any) => {
  if (!data.email || !data.password || !data.confirmPassword || !data.role) {
    throw new Error("Missing required fields");
  }

  if (!validator.isEmail(data.email)) {
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

export const validateRegisterEmployer = (data: any) => {
  if (
    !data.email ||
    !data.password ||
    !data.confirmPassword ||
    !data.companyName ||
    !data.registrationFileUrl
  ) {
    throw new Error("Missing employer fields");
  }

  if (!validator.isEmail(data.email)) {
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

export const validateLogin = (data: any) => {
  if (!data.email || !data.password) {
    throw new Error("Email and password required");
  }

  const normalizedEmail = String(data.email).trim().toLowerCase();
  if (!validator.isEmail(normalizedEmail)) {
    throw new Error("Invalid email format");
  }

  data.email = normalizedEmail;
};

export const validateResetPassword = (newPassword: string) => {
  if (!newPassword || newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    throw new Error("Password must contain at least one uppercase letter and one number");
  }
};
