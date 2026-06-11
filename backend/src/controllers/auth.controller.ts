import { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register a new passenger or driver.
   * POST /api/auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.authService.register(req.body);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error in register controller:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Registration failed",
      });
    }
  };

  /**
   * Refresh the access and refresh token pair.
   * POST /api/auth/refresh-token
   */
  refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      const tokens = await this.authService.refreshAccessToken(refreshToken);
      res.status(200).json({
        success: true,
        ...tokens,
      });
    } catch (error: any) {
      console.error("Error in refreshToken controller:", error);
      res.status(401).json({
        success: false,
        error: error.message || "Failed to refresh token",
      });
    }
  };

  /**
   * Log out a user session by revoking the refresh token.
   * POST /api/auth/logout
   */
  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { refreshToken } = req.body;
      await this.authService.logout(refreshToken);
      res.status(200).json({
        success: true,
        message: "Logged out successfully",
      });
    } catch (error: any) {
      console.error("Error in logout controller:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to logout",
      });
    }
  };

  /**
   * Get the current authenticated user's profile.
   * GET /api/auth/me
   */
  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({
          success: false,
          error: "Unauthorized",
        });
        return;
      }
      const user = await this.authService.getUserProfile(req.user.id);
      res.status(200).json({
        success: true,
        user,
      });
    } catch (error: any) {
      console.error("Error in me controller:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to fetch profile",
      });
    }
  };
}
