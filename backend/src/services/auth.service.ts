import { pool } from "../config/db";
import { UserRepository, UserRecord } from "../repositories/user.repository";
import { OtpRepository } from "../repositories/otp.repository";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { DriverProfileRepository } from "../repositories/driver-profile.repository";
import { OtpService } from "./otp.service";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken";
import bcrypt from "bcrypt";

export interface LoginResponse {
  success: boolean;
  isRegistered: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: UserRecord;
  message?: string;
}

export interface RegisterDto {
  phone: string;
  otp: string;
  password: string;
  name: string;
  role: "PASSENGER" | "DRIVER";
  email?: string;
  licenseNo?: string; // Required for DRIVER
}

export class AuthService {
  private userRepository: UserRepository;
  private otpRepository: OtpRepository;
  private refreshTokenRepository: RefreshTokenRepository;
  private driverProfileRepository: DriverProfileRepository;
  private otpService: OtpService;

  constructor() {
    this.userRepository = new UserRepository();
    this.otpRepository = new OtpRepository();
    this.refreshTokenRepository = new RefreshTokenRepository();
    this.driverProfileRepository = new DriverProfileRepository();
    this.otpService = new OtpService();
  }

  /**
   * Verify OTP. If the user is registered, login and issue tokens.
   * If not registered, notify client to prompt registration.
   */
  async verifyAndLogin(phone: string, otp: string): Promise<LoginResponse> {
    // 1. Verify OTP
    await this.otpService.verifyOtp(phone, otp);

    // 2. Check if user exists
    const user = await this.userRepository.findByPhone(phone);
    if (!user) {
      return {
        success: true,
        isRegistered: false,
        message: "OTP verified successfully. Please complete registration.",
      };
    }

    // 3. User exists, validate status
    if (user.status !== "ACTIVE") {
      throw new Error(`User account is ${user.status.toLowerCase()}`);
    }

    // 4. Generate tokens
    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken();

    // 30 days expiry for refresh token
    const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create(user.id, refreshToken, refreshTokenExpiry);

    return {
      success: true,
      isRegistered: true,
      accessToken,
      refreshToken,
      user,
    };
  }

  /**
   * Register a new passenger or driver.
   * Ensures that the OTP is already verified.
   * Uses a database transaction if registering a driver to create base user + driver profile.
   */
  async register(dto: RegisterDto): Promise<LoginResponse> {
    // 1. Ensure OTP was verified recently (within the last 10 minutes)
    const latestOtp = await this.otpRepository.findLatestOtp(dto.phone);
    if (!latestOtp || !latestOtp.verified || latestOtp.otp !== dto.otp) {
      throw new Error("Phone number must be verified by OTP before registering");
    }

    const timeSinceVerification = Date.now() - latestOtp.expires_at.getTime() + (5 * 60 * 1000); // offset since expires_at is 5min after created_at
    // We check if the verification happened within 15 minutes of now
    // Actually, simply checking if record verified is true is fine, but checking recency is safer:
    const recordCreatedTime = new Date(latestOtp.expires_at.getTime() - 5 * 60 * 1000);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    if (recordCreatedTime < tenMinutesAgo) {
      throw new Error("Verification session expired. Please verify OTP again");
    }

    // 2. Check if user already exists
    const existingUser = await this.userRepository.findByPhone(dto.phone);
    if (existingUser) {
      throw new Error("Phone number is already registered. Please login.");
    }

    // Hash the password using bcrypt
    const passwordHash = await bcrypt.hash(dto.password, 10);

    let createdUser: UserRecord;

    // 3. Register user. If role is DRIVER, run database transaction
    if (dto.role === "DRIVER") {
      if (!dto.licenseNo) {
        throw new Error("Driver license number is required for driver registration");
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Create base user record
        createdUser = await this.userRepository.create(
          {
            phone: dto.phone,
            name: dto.name,
            role: "DRIVER",
            email: dto.email,
            password: passwordHash,
          },
          client
        );

        // Create driver profile
        await this.driverProfileRepository.create(client, {
          userId: createdUser.id,
          licenseNo: dto.licenseNo,
        });

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } else {
      // PASSENGER registration
      createdUser = await this.userRepository.create({
        phone: dto.phone,
        name: dto.name,
        role: "PASSENGER",
        email: dto.email,
        password: passwordHash,
      });
    }

    // 4. Generate tokens for direct login after registration
    const accessToken = generateAccessToken({ id: createdUser.id, role: createdUser.role });
    const refreshToken = generateRefreshToken();

    const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await this.refreshTokenRepository.create(createdUser.id, refreshToken, refreshTokenExpiry);

    return {
      success: true,
      isRegistered: true,
      accessToken,
      refreshToken,
      user: createdUser,
    };
  }

  /**
   * Refresh the user's access token using a refresh token.
   * Employs Refresh Token Rotation (RTR).
   */
  async refreshAccessToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Find refresh token in DB
    const record = await this.refreshTokenRepository.findToken(token);
    if (!record) {
      throw new Error("Invalid refresh token");
    }

    // Verify token expiry
    if (record.expires_at < new Date()) {
      await this.refreshTokenRepository.deleteToken(token);
      throw new Error("Refresh token expired. Please login again.");
    }

    // Retrieve user
    const user = await this.userRepository.findById(record.user_id);
    if (!user) {
      throw new Error("User associated with token not found");
    }

    if (user.status !== "ACTIVE") {
      throw new Error(`User account is ${user.status.toLowerCase()}`);
    }

    // Rotate refresh token: delete old, create new
    await this.refreshTokenRepository.deleteToken(token);

    const newAccessToken = generateAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = generateRefreshToken();
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await this.refreshTokenRepository.create(user.id, newRefreshToken, newExpiry);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Log out a user session by revoking the refresh token.
   */
  async logout(token: string): Promise<void> {
    await this.refreshTokenRepository.deleteToken(token);
  }

  /**
   * Get user details.
   */
  async getUserProfile(userId: string): Promise<UserRecord> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error("User profile not found");
    }
    return user;
  }
}
