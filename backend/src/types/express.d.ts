declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "PASSENGER" | "DRIVER" | "ADMIN";
      };
    }
  }
}

export {};
