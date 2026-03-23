import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-key-change-in-production";

// ─── Extend Express Request ────────────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      admin_id?: number;
      admin_email?: string;
      business_id?: number;
      business_email?: string;
    }
  }
}

// ─── Admin token middleware ────────────────────────────────────────────────────
export const verifyAdminToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing or invalid Authorization header" });

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      admin_id: number;
      email: string;
      role: string;
    };
    if (decoded.role !== "admin")
      return res.status(403).json({ error: "Admin access required" });
    req.admin_id = decoded.admin_id;
    req.admin_email = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ─── Business token middleware ─────────────────────────────────────────────────
export const verifyBusinessToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing or invalid Authorization header" });

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      business_id: number;
      email: string;
      role: string;
    };
    if (decoded.role !== "business")
      return res.status(403).json({ error: "Business access required" });
    req.business_id = decoded.business_id;
    req.business_email = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ─── Token generators ─────────────────────────────────────────────────────────
export const generateAdminToken = (adminId: number, email: string): string =>
  jwt.sign({ admin_id: adminId, email, role: "admin" }, JWT_SECRET, {
    expiresIn: "24h",
  });

export const generateBusinessToken = (
  businessId: number,
  email: string
): string =>
  jwt.sign({ business_id: businessId, email, role: "business" }, JWT_SECRET, {
    expiresIn: "24h",
  });
