import { Request, Response } from "express";
import bcrypt from "bcrypt";
import getDb from "../db";
import { generateBusinessToken } from "../middleware/auth";

/**
 * ✅ v1.7: Register Business User
 * POST /api/businesses/register
 * Body: { company_name, email, password, phone }
 * Returns: { business_id, business_token, company_name, email }
 */
export const registerBusiness = async (req: Request, res: Response) => {
  try {
    const { company_name, email, password, phone } = req.body;

    // ✅ Validation
    if (!company_name || !email || !password) {
      return res
        .status(400)
        .json({ error: "company_name, email, and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    const db = getDb();

    // ✅ Check if email already exists
    const existingBusiness = db
      .prepare("SELECT * FROM businesses WHERE email = ?")
      .get(email);

    if (existingBusiness) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // ✅ Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // ✅ Insert into database
    const result = db
      .prepare(
        `INSERT INTO businesses (company_name, email, password_hash, phone, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .run(company_name, email, passwordHash, phone || null);

    const businessId = result.lastInsertRowid as number;

    // ✅ Generate token
    const business_token = generateBusinessToken(businessId, email);

    res.status(201).json({
      success: true,
      business_id: businessId,
      business_token,
      company_name,
      email,
      message: "Registration successful",
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * ✅ v1.7: Login Business User
 * POST /api/businesses/login
 * Body: { email, password }
 * Returns: { business_id, business_token, company_name, email }
 */
export const loginBusiness = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // ✅ Validation
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const db = getDb();

    // ✅ Find business
    const business = db
      .prepare(
        "SELECT id, company_name, email, password_hash FROM businesses WHERE email = ?",
      )
      .get(email) as any;

    if (!business) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // ✅ Verify password
    const isPasswordValid = await bcrypt.compare(
      password,
      business.password_hash,
    );

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // ✅ Generate token
    const business_token = generateBusinessToken(business.id, business.email);

    res.status(200).json({
      success: true,
      business_id: business.id,
      business_token,
      company_name: business.company_name,
      email: business.email,
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * ✅ v1.7: Get Business Profile
 * GET /api/businesses/me
 * Requires: Authorization: Bearer business_token
 * Returns: { id, company_name, email, phone, created_at }
 */
export const getBusinessProfile = (req: Request, res: Response) => {
  try {
    const businessId = req.businessId;

    if (!businessId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = getDb();

    const business = db
      .prepare(
        "SELECT id, company_name, email, phone, created_at FROM businesses WHERE id = ?",
      )
      .get(businessId);

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.status(200).json({
      success: true,
      data: business,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
