import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "rideorbitsecret";

export interface TokenPayload {
  id: string;
  role: "PASSENGER" | "DRIVER" | "ADMIN";
}

/**
 * Generate a JWT access token that expires in 1 hour.
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

/**
 * Generate a cryptographically secure 80-character hex string for use as a refresh token.
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}
