import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  validateRegister,
  validateRefreshToken,
} from "../middleware/auth.validator";
import otpRoutes from "./otp.routes";

const router = Router();
const authController = new AuthController();

// Mount OTP routes under /otp (resolves to /api/auth/otp/...)
router.use("/otp", otpRoutes);

// POST /api/auth/register - Register passenger or driver
router.post("/register", validateRegister, authController.register);

// POST /api/auth/refresh-token - Generate new access and refresh token pair
router.post("/refresh-token", validateRefreshToken, authController.refreshToken);

// POST /api/auth/logout - End session and revoke refresh token
router.post("/logout", validateRefreshToken, authController.logout);

// GET /api/auth/me - Retrieve current user profile (Requires Authentication)
router.get("/me", authenticate, authController.me);

export default router;
