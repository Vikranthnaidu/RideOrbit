import { Request, Response, NextFunction } from "express";

/**
 * Middleware factory to restrict route access to specific roles.
 */
export function authorizeRoles(...allowedRoles: ("PASSENGER" | "DRIVER" | "ADMIN")[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized. Please authenticate first.",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Role '${req.user.role}' is not authorized.`,
      });
      return;
    }

    next();
  };
}
