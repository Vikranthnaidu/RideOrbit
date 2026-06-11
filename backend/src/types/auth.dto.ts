export interface SendOtpDto {
  phone: string;
}

export interface VerifyOtpDto {
  phone: string;
  otp: string;
}

export interface RegisterUserDto {
  phone: string;
  otp: string;
  password: string;
  name: string;
  role: "PASSENGER" | "DRIVER";
  email?: string;
  licenseNo?: string; // Required if role is DRIVER
}

export interface RefreshTokenDto {
  refreshToken: string;
}
