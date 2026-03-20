import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// ✅ Extend Express Request to include decoded token data
declare global {
  namespace Express {
    interface Request {
      businessId?: number;
      businessEmail?: string;
    }
  }
}

// ✅ v1.7: Use same JWT_SECRET as server.ts to ensure token compatibility
const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-key-change-in-production";

/**
 * Middleware: Verify Business Token (JWT)
 * ✅ v1.7: Protects /api/businesses/* routes
 * Checks Authorization header for "Bearer <token>"
 * Decodes token and attaches businessId to request
 */
export const verifyBusinessToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      business_id: number;
      email: string;
      iat: number;
      exp: number;
    };

    // ✅ Support both business_id (from inline) and businessId (from new system)
    req.businessId = decoded.business_id || decoded.businessId;
    req.businessEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * Generate Business JWT Token
 * ✅ v1.7: Called during register/login
 * Token expires in 7 days
 * Uses old format (business_id) for backward compatibility
 */
export const generateBusinessToken = (
  businessId: number,
  email: string,
): string => {
  return jwt.sign(
    {
      business_id: businessId,
      email,
    },
    JWT_SECRET,
    { expiresIn: "24h" },
  );
};
