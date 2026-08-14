import jwt from "jsonwebtoken"
import { env } from "../config/env"

export const generateAccessToken = (payload: object) => {
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "15m"
  })
}

export const generateRefreshToken = (payload: object) => {
  if (!env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d"
  })
}

export const verifyAccessToken = (token: string) => {
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.verify(token, env.JWT_SECRET)
}

export const verifyRefreshToken = (token: string) => {
  if (!env.JWT_REFRESH_SECRET) {
    throw new Error("JWT_REFRESH_SECRET is not configured");
  }
  return jwt.verify(token, env.JWT_REFRESH_SECRET)
}