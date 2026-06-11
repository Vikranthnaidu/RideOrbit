import { pool } from "../config/db";

export interface OtpVerificationRecord {
  id: string;
  phone: string;
  otp: string;
  expires_at: Date;
  verified: boolean;
  created_at: Date;
}

export class OtpRepository {
  /**
   * Save a newly generated OTP for a phone number.
   */
  async createOtp(phone: string, otp: string, expiresAt: Date): Promise<OtpVerificationRecord> {
    const query = `
      INSERT INTO otp_verifications (phone, otp, expires_at, verified)
      VALUES ($1, $2, $3, false)
      RETURNING id, phone, otp, expires_at, verified, created_at;
    `;
    const values = [phone, otp, expiresAt];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Find the latest generated OTP verification record for a phone number.
   */
  async findLatestOtp(phone: string): Promise<OtpVerificationRecord | null> {
    const query = `
      SELECT id, phone, otp, expires_at, verified, created_at
      FROM otp_verifications
      WHERE phone = $1
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const result = await pool.query(query, [phone]);
    if (result.rows.length === 0) {
      return null;
    }
    return result.rows[0];
  }

  /**
   * Mark an OTP record as verified.
   */
  async markAsVerified(id: string): Promise<void> {
    const query = `
      UPDATE otp_verifications
      SET verified = true
      WHERE id = $1;
    `;
    await pool.query(query, [id]);
  }
}
