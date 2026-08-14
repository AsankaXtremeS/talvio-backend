// Type definitions for user roles and auth input types.
export type Role = "STUDENT" | "PROFESSIONAL" | "EMPLOYER" | "ADMIN";

export interface RegisterUserInput {
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
}

export interface RegisterEmployerInput {
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  registrationFileUrl: string;
  registrationFileName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}
