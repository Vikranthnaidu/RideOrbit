import { Request, Response, NextFunction } from "express";
import { OtpService } from "../services/otp.service";
import { AuthService } from "../services/auth.service";

export class OtpController {
  private otpService: OtpService;
  private authService: AuthService;

  constructor() {
    this.otpService = new OtpService();
    this.authService = new AuthService();
  }

  /**
   * Send an OTP to the user's phone number.
   * POST /api/auth/otp/send
   */
  sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone } = req.body;
      const otpRecord = await this.otpService.sendOtp(phone);
      res.status(200).json({
        success: true,
        message: "OTP sent successfully",
        otp: otpRecord.otp,
        expiresAt: otpRecord.expires_at,
      });
    } catch (error: any) {
      console.error("Error in sendOtp controller:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to send OTP",
      });
    }
  };

  /**
   * Verify the OTP and attempt login.
   * POST /api/auth/otp/verify
   */
  verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { phone, otp } = req.body;
      const result = await this.authService.verifyAndLogin(phone, otp);
      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in verifyOtp controller:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to verify OTP",
      });
    }
  };
}
