import { Request, Response, NextFunction } from "express";

// Regex for E.164 phone numbers (10 to 15 digits with optional leading +)
const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;
// Regex for exactly 6 digits
const OTP_REGEX = /^\d{6}$/;
// Regex for standard email format
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validator middleware for sending OTP.
 */
export function validateSendOtp(req: Request, res: Response, next: NextFunction) {
  const { phone } = req.body;
  if (!phone || typeof phone !== "string" || !PHONE_REGEX.test(phone)) {
    return res.status(400).json({
      success: false,
      error: "Invalid phone number format. Please provide a valid E.164 phone number (e.g., +919876543210).",
    });
  }
  next();
}

/**
 * Validator middleware for verifying OTP.
 */
export function validateVerifyOtp(req: Request, res: Response, next: NextFunction) {
  const { phone, otp } = req.body;
  if (!phone || typeof phone !== "string" || !PHONE_REGEX.test(phone)) {
    return res.status(400).json({
      success: false,
      error: "Invalid phone number format.",
    });
  }
  if (!otp || typeof otp !== "string" || !OTP_REGEX.test(otp)) {
    return res.status(400).json({
      success: false,
      error: "Invalid OTP format. Must be a 6-digit numeric string.",
    });
  }
  next();
}

/**
 * Validator middleware for user registration.
 */
export function validateRegister(req: Request, res: Response, next: NextFunction) {
  const { phone, otp, password, name, role, email, licenseNo } = req.body;

  if (!phone || typeof phone !== "string" || !PHONE_REGEX.test(phone)) {
    return res.status(400).json({ success: false, error: "Invalid phone number format." });
  }
  if (!otp || typeof otp !== "string" || !OTP_REGEX.test(otp)) {
    return res.status(400).json({ success: false, error: "Invalid OTP. Must be a 6-digit numeric string." });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
  }
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ success: false, error: "Name must be at least 2 characters long." });
  }
  if (role !== "PASSENGER" && role !== "DRIVER") {
    return res.status(400).json({ success: false, error: "Role must be either PASSENGER or DRIVER." });
  }
  if (email && (typeof email !== "string" || !EMAIL_REGEX.test(email))) {
    return res.status(400).json({ success: false, error: "Invalid email address format." });
  }
  if (role === "DRIVER" && (!licenseNo || typeof licenseNo !== "string" || licenseNo.trim().length < 5)) {
    return res.status(400).json({ success: false, error: "Valid license number is required for driver registration." });
  }
  next();
}

/**
 * Validator middleware for refresh token requests.
 */
export function validateRefreshToken(req: Request, res: Response, next: NextFunction) {
  const { refreshToken } = req.body;
  if (!refreshToken || typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: "Refresh token is required.",
    });
  }
  next();
}
