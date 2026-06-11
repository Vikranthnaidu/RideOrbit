import { OtpRepository, OtpVerificationRecord } from "../repositories/otp.repository";
import { generateOtp } from "../utils/generateOtp";

export class OtpService {
  private otpRepository: OtpRepository;

  constructor() {
    this.otpRepository = new OtpRepository();
  }

  /**
   * Generate and send an OTP to a phone number.
   * In development, it prints the OTP to the console.
   */
  async sendOtp(phone: string): Promise<OtpVerificationRecord> {
    // Generate 6-digit numeric OTP
    const otp = generateOtp();
    
    // OTP is valid for 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save in the database
    const otpRecord = await this.otpRepository.createOtp(phone, otp, expiresAt);

    // MOCK SMS SENDING: Log the OTP to console.
    console.log(`[SMS Service Mock] 📲 Sent OTP [${otp}] to phone [${phone}]. Valid for 5 minutes.`);

    return otpRecord;
  }

  /**
   * Verify an OTP for a phone number.
   * Throws an error if validation fails.
   */
  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const record = await this.otpRepository.findLatestOtp(phone);
    if (!record) {
      throw new Error("No OTP request found for this phone number");
    }

    if (record.verified) {
      throw new Error("This OTP has already been verified and used");
    }

    const now = new Date();
    if (record.expires_at < now) {
      throw new Error("OTP has expired. Please request a new one");
    }

    if (record.otp !== otp) {
      throw new Error("Invalid OTP");
    }

    // Mark as verified
    await this.otpRepository.markAsVerified(record.id);
    return true;
  }
}
