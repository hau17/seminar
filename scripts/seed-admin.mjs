/**
 * ADMIN SEED SCRIPT — GPS Tourism v1.6
 * ─────────────────────────────────────
 * Tạo hoặc RESET tài khoản Admin mặc định vào SQLite.
 * Password bắt buộc hash bằng bcrypt (BR-13).
 *
 * Cách chạy:
 *   node scripts/seed-admin.mjs
 *
 * Override qua biến môi trường:
 *   ADMIN_EMAIL=myemail@x.com ADMIN_PASSWORD=MyPass@999 node scripts/seed-admin.mjs
 */

import Database from "better-sqlite3";
import bcrypt from "bcrypt";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";
const ADMIN_NAME     = process.env.ADMIN_NAME     || "Admin";
const DB_PATH        = path.join(__dirname, "..", "data.db");

(async () => {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Đảm bảo bảng admins tồn tại
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      name          TEXT    NOT NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get(ADMIN_EMAIL);

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  if (existing) {
    // Nếu đã tồn tại → UPDATE password hash (force-reset)
    db.prepare("UPDATE admins SET password_hash = ?, name = ? WHERE email = ?")
      .run(hash, ADMIN_NAME, ADMIN_EMAIL);
    console.log(`✅ [SEED] Admin đã tồn tại — RESET password thành công.`);
  } else {
    db.prepare("INSERT INTO admins (email, password_hash, name) VALUES (?, ?, ?)")
      .run(ADMIN_EMAIL, hash, ADMIN_NAME);
    console.log(`✅ [SEED] Admin mới đã được tạo.`);
  }

  console.log(`\n📋 Thông tin đăng nhập Admin:`);
  console.log(`   Email   : ${ADMIN_EMAIL}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log(`   Endpoint: POST /api/auth/admin/login`);
  console.log(`\n🔐 Password đã được hash bằng bcrypt (salt rounds = 10).`);

  db.close();
})();
