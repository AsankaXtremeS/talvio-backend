import dotenv from "dotenv"

dotenv.config()


if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing")
}

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing")
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_REFRESH_SECRET is missing")
}

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  throw new Error("SMTP_HOST, SMTP_USER, and SMTP_PASS are required for email delivery")
}

if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing")

export const env = {
  PORT: process.env.PORT || 8000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  NODE_ENV: process.env.NODE_ENV || "development",
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT || "587",
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM || "noreply@talvio.com",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",

  // OAuth credentials
  BACKEND_URL: process.env.BACKEND_URL || "http://localhost:8000",
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,


  // API keys for LLM providers
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,



  // Google Calendar integration (Service Account — for interview scheduling)
  // Leave blank to disable calendar integration (app still works without it)
  GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  GOOGLE_CALENDAR_ID: process.env.GOOGLE_CALENDAR_ID,
}