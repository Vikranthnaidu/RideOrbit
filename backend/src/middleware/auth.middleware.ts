import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRepository } from "../repositories/user.repository";
import { TokenPayload } from "../utils/generateToken";

const JWT_SECRET = process.env.JWT_SECRET || "rideorbitsecret";
const userRepository = new UserRepository();

/**
 * Middleware to authenticate requests using JWT access tokens.
 * Verifies token validity and checks user existence & status in the database.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Access token required. Please authenticate via Bearer token.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (err: any) {
      res.status(401).json({
        success: false,
        error: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token",
      });
      return;
    }

    // Check user in database
    const user = await userRepository.findById(payload.id);
    if (!user) {
      res.status(401).json({
        success: false,
        error: "User not found. Authentication revoked.",
      });
      return;
    }

    if (user.status !== "ACTIVE") {
      res.status(403).json({
        success: false,
        error: `User account is ${user.status.toLowerCase()}. Access denied.`,
      });
      return;
    }

    // Attach user payload
    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error during authentication",
    });
  }
}
