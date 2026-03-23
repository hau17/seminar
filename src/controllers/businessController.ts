import { Request, Response } from "express";
import bcrypt from "bcrypt";
import getDb from "../db";
import { generateBusinessToken } from "../middleware/auth";

/**
 * Register Business User
 * POST /api/auth/business/register
 * Body: { name, email, password }
 */
export const registerBusiness = async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirm_password } = req.body;

    if (!name?.trim() || !email?.trim() || !password)
      return res.status(400).json({ error: "name, email, password là bắt buộc" });

    if (password.length < 8)
      return res.status(400).json({ error: "Mật khẩu phải tối thiểu 8 ký tự" });

    if (confirm_password && confirm_password !== password)
      return res.status(400).json({ error: "Mật khẩu xác nhận không khớp" });

    const db = getDb();

    const existing = db.prepare("SELECT id FROM businesses WHERE email = ?").get(email);
    if (existing) return res.status(409).json({ error: "Email đã được sử dụng" });

    const hash = await bcrypt.hash(password, 10);
    db.prepare("INSERT INTO businesses (name, email, password_hash) VALUES (?, ?, ?)").run(
      name.trim(), email.trim(), hash
    );

    res.status(201).json({ message: "Đăng ký thành công" });
  } catch (err) {
    console.error("registerBusiness:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Login Business User
 * POST /api/auth/business/login
 * Body: { email, password }
 */
export const loginBusiness = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email và mật khẩu không được rỗng" });

    const db = getDb();
    const biz = db
      .prepare("SELECT id, name, email, password_hash FROM businesses WHERE email = ?")
      .get(email) as any;

    if (!biz) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

    const match = await bcrypt.compare(password, biz.password_hash);
    if (!match) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

    const token = generateBusinessToken(biz.id, biz.email);
    res.json({
      token,
      business: { id: biz.id, name: biz.name, email: biz.email },
    });
  } catch (err) {
    console.error("loginBusiness:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};

/**
 * Get Business Profile
 * GET /api/auth/business/me
 */
export const getBusinessProfile = (req: Request, res: Response) => {
  try {
    const businessId = req.business_id;
    if (!businessId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const biz = db
      .prepare("SELECT id, name, email, created_at FROM businesses WHERE id = ?")
      .get(businessId);

    if (!biz) return res.status(404).json({ error: "Doanh nghiệp không tồn tại" });
    res.json(biz);
  } catch (err) {
    console.error("getBusinessProfile:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
};
