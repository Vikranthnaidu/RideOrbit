import { Router } from "express";
import { OtpController } from "../controllers/otp.controller";
import { validateSendOtp, validateVerifyOtp } from "../middleware/auth.validator";

const router = Router();
const otpController = new OtpController();

// POST /api/auth/otp/send - Send OTP to phone number
router.post("/send", validateSendOtp, otpController.sendOtp);

// POST /api/auth/otp/verify - Verify OTP and login or request registration
router.post("/verify", validateVerifyOtp, otpController.verifyOtp);

export default router;
