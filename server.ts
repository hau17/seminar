import express from "express";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";
import bcrypt from "bcrypt";
import { spawn } from "child_process";
import qrcode from "qrcode-terminal";
import os from "os";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Upload directories ───────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, "public", "uploads");
const poisDir = path.join(uploadsDir, "pois");
const toursDir = path.join(uploadsDir, "tours");
const audioDir = path.join(uploadsDir, "audio");

for (const dir of [poisDir, toursDir, audioDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ─── Multer (multi-image, max 5, 5MB each) ────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const folder = req.path.includes("/tours") ? toursDir : poisDir;
    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.mimetype))
      return cb(new Error("Chỉ chấp nhận file JPG, PNG, WebP"));
    cb(null, true);
  },
});

// ─── Config ───────────────────────────────────────────────────────────────────
const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-key-change-in-production";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";

// ─── Database ─────────────────────────────────────────────────────────────────
const db = new Database("data.db");
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  -- admins
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    name          TEXT    NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- users
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    language_code TEXT    NOT NULL DEFAULT 'vi',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- businesses
  CREATE TABLE IF NOT EXISTS businesses (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  -- pois
  CREATE TABLE IF NOT EXISTS pois (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL,
    lat         REAL    NOT NULL,
    lng         REAL    NOT NULL,
    range_m     INTEGER NOT NULL DEFAULT 1,
    owner_type  TEXT    NOT NULL,
    owner_id    INTEGER NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_pois_owner    ON pois(owner_type, owner_id);
  CREATE INDEX IF NOT EXISTS idx_pois_location ON pois(lat, lng);

  -- poi_images
  CREATE TABLE IF NOT EXISTS poi_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    poi_id     INTEGER NOT NULL,
    file_path  TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
  );

  -- poi_translations (kept for future TTS phase — not modified here)
  CREATE TABLE IF NOT EXISTS poi_translations (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    poi_id                 INTEGER NOT NULL,
    language_code          TEXT    NOT NULL,
    translated_description TEXT    NOT NULL,
    created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poi_id, language_code),
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
  );

  -- poi_audio_files (kept for future TTS phase — not modified here)
  CREATE TABLE IF NOT EXISTS poi_audio_files (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    poi_id        INTEGER NOT NULL,
    language_code TEXT    NOT NULL,
    version       INTEGER NOT NULL DEFAULT 0,
    file_path     TEXT    NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poi_id, language_code),
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE
  );

  -- tours
  CREATE TABLE IF NOT EXISTS tours (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    description     TEXT,
    created_by_type TEXT    NOT NULL,
    created_by_id   INTEGER NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_tours_creator ON tours(created_by_type, created_by_id);

  -- tour_images
  CREATE TABLE IF NOT EXISTS tour_images (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tour_id    INTEGER NOT NULL,
    file_path  TEXT    NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
  );

  -- tour_pois
  CREATE TABLE IF NOT EXISTS tour_pois (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    tour_id  INTEGER NOT NULL,
    poi_id   INTEGER NOT NULL,
    position INTEGER NOT NULL,
    UNIQUE(tour_id, poi_id),
    UNIQUE(tour_id, position),
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
    FOREIGN KEY (poi_id)  REFERENCES pois(id)
  );
  CREATE INDEX IF NOT EXISTS idx_tour_pois_tour ON tour_pois(tour_id, position);
  CREATE INDEX IF NOT EXISTS idx_tour_pois_poi  ON tour_pois(poi_id);

  -- languages
  CREATE TABLE IF NOT EXISTS languages (
    code      TEXT    PRIMARY KEY,
    name      TEXT    NOT NULL,
    tts_voice TEXT    NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );
  INSERT OR IGNORE INTO languages VALUES ('vi', 'Tiếng Việt',  'vi-VN-HoaiMyNeural',   1);
  INSERT OR IGNORE INTO languages VALUES ('en', 'English',     'en-US-JennyNeural',     1);
  INSERT OR IGNORE INTO languages VALUES ('zh', '中文',         'zh-CN-XiaoxiaoNeural',  1);
  INSERT OR IGNORE INTO languages VALUES ('ja', '日本語',       'ja-JP-NanamiNeural',    1);
  INSERT OR IGNORE INTO languages VALUES ('ko', '한국어',       'ko-KR-SunHiNeural',     1);
`);

// ─── Seed default admin from env vars ─────────────────────────────────────────
async function seedAdmin() {
  const existing = db.prepare("SELECT id FROM admins WHERE email = ?").get(ADMIN_EMAIL);
  if (!existing) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    db.prepare("INSERT INTO admins (email, password_hash, name) VALUES (?, ?, ?)").run(
      ADMIN_EMAIL,
      hash,
      "Admin"
    );
    console.log(`[SEED] Admin account created: ${ADMIN_EMAIL}`);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const runPythonScript = (scriptName: string, args: string[]): Promise<string> => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "scripts", scriptName); 
    const pyProg = spawn("python", [scriptPath, ...args]);
    
    let output = "";
    let error = "";

    pyProg.stdout.on("data", (data) => { output += data.toString(); });
    pyProg.stderr.on("data", (data) => { error += data.toString(); });

    pyProg.on("close", (code) => {
      if (code === 0) resolve(output.trim());
      else reject(new Error(`Python Script Failed (${code}): ${error}`));
    });
  });
};

function generateAudio(poiId: number, description: string) {
  const fileName = `poi_${poiId}_vi_v0.mp3`;
  const relativePath = `/uploads/audio/${fileName}`;
  const absolutePath = path.join(audioDir, fileName);

  const langRow = db.prepare("SELECT tts_voice FROM languages WHERE code='vi'").get() as any;
  const ttsVoice = langRow ? langRow.tts_voice : 'vi-VN-HoaiMyNeural';

  const pyProcess = spawn("python", [
    "scripts/tts.py",
    "--text", description,
    "--voice", ttsVoice,
    "--output", absolutePath
  ]);

  let stderr = "";
  pyProcess.stderr.on("data", (data) => { stderr += data.toString(); });

  pyProcess.on("close", (code) => {
    if (code === 0) {
      try {
        db.prepare(`
          INSERT INTO poi_audio_files (poi_id, language_code, version, file_path)
          VALUES (?, 'vi', 0, ?)
          ON CONFLICT(poi_id, language_code) 
          DO UPDATE SET file_path=excluded.file_path, version=0
        `).run(poiId, relativePath);
        console.log(`[TTS] Generated audio for POI ${poiId} successfully at ${relativePath}`);
      } catch (err) {
        console.error(`[TTS] DB insert failed for POI ${poiId}:`, err);
      }
    } else {
      console.error(`[TTS] Python script failed for POI ${poiId}. Code: ${code}. Error: ${stderr}`);
    }
  });
}

// Cập nhật hàm deleteFile cho chuẩn
function deleteFile(relativePath) {
  if (!relativePath) return;
  try {
    const absPath = path.join(__dirname, "public", relativePath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
      console.log(`[FS] Deleted: ${relativePath}`);
    }
  } catch (e) {
    console.warn("[FS] Could not delete:", relativePath, e.message);
  }
}

// Hàm dọn dẹp tất cả tài nguyên (Ảnh + Audio) của một POI
function cleanupPoiResources(poiId) {
  // 1. Xóa ảnh
  const images = db.prepare("SELECT file_path FROM poi_images WHERE poi_id=?").all(poiId);
  images.forEach((img) => deleteFile(img.file_path));

  // 2. Xóa audio
  const audios = db.prepare("SELECT file_path FROM poi_audio_files WHERE poi_id=?").all(poiId);
  audios.forEach((audio) => deleteFile(audio.file_path));

  // Lưu ý: ON DELETE CASCADE trong DB sẽ tự dọn dẹp các bản ghi trong table
  // poi_images và poi_audio_files, nên ta chỉ cần dọn file vật lý ở đây.
}
function getPoisWithImages(poiRows: any[]) {
  if (!poiRows.length) return [];
  const ids = poiRows.map((p) => p.id).join(",");
  const images = db
    .prepare(`SELECT * FROM poi_images WHERE poi_id IN (${ids}) ORDER BY sort_order`)
    .all() as any[];
  const audioFiles = db
    .prepare(`SELECT * FROM poi_audio_files WHERE poi_id IN (${ids})`)
    .all() as any[];
  const translations = db
    .prepare(`SELECT * FROM poi_translations WHERE poi_id IN (${ids})`)
    .all() as any[];
  return poiRows.map((p) => ({
    ...p,
    images: images.filter((i) => i.poi_id === p.id),
    audio_files: audioFiles.filter((a) => a.poi_id === p.id),
    translations: translations.filter((t) => t.poi_id === p.id),
  }));
}

function getToursWithDetails(tourRows: any[]) {
  if (!tourRows.length) return [];
  const ids = tourRows.map((t) => t.id).join(",");
  const images = db
    .prepare(`SELECT * FROM tour_images WHERE tour_id IN (${ids}) ORDER BY sort_order`)
    .all() as any[];
  const pois = db
    .prepare(
      `SELECT tp.tour_id, tp.position, tp.poi_id, p.name, p.lat, p.lng
       FROM tour_pois tp JOIN pois p ON tp.poi_id = p.id
       WHERE tp.tour_id IN (${ids}) ORDER BY tp.tour_id, tp.position`
    )
    .all() as any[];
  return tourRows.map((t) => ({
    ...t,
    images: images.filter((i) => i.tour_id === t.id),
    pois: pois.filter((p) => p.tour_id === t.id),
    poi_ids: pois.filter((p) => p.tour_id === t.id).map((p) => p.poi_id),
  }));
}

// ─── App ──────────────────────────────────────────────────────────────────────
async function startServer() {
  await seedAdmin();

  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use("/uploads", express.static(uploadsDir));

  // Request logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () =>
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`
      )
    );
    next();
  });

  // ─── Auth Middlewares ───────────────────────────────────────────────────────

  const adminAuth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== "admin")
        return res.status(403).json({ error: "Admin access required" });
      req.admin_id = decoded.admin_id;
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };

  const businessAuth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded.role !== "business")
        return res.status(403).json({ error: "Business access required" });
      req.business_id = decoded.business_id;
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };

  const userAuth = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      // We accept 'user' role. Note: in /api/auth/user/login, we sign with { id, role: "user" }
      if (decoded.role !== "user")
        return res.status(403).json({ error: "User access required" });
      req.user_id = decoded.id;
      next();
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTH ROUTES
  // ═══════════════════════════════════════════════════════════════════════════

  // Admin Login
  app.post("/api/auth/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: "Email và mật khẩu không được rỗng" });

      const admin = db
        .prepare("SELECT * FROM admins WHERE email = ?")
        .get(email) as any;

      if (!admin) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

      const match = await bcrypt.compare(password, admin.password_hash);
      if (!match) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

      const token = jwt.sign(
        { admin_id: admin.id, email: admin.email, role: "admin" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        admin: { id: admin.id, name: admin.name, email: admin.email },
      });
    } catch (e) {
      console.error("POST /api/auth/admin/login:", e);
      res.status(500).json({ error: "Lỗi đăng nhập" });
    }
  });

  // Business Register
  app.post("/api/auth/business/register", async (req, res) => {
    try {
      const { name, email, password, confirm_password } = req.body;

      if (!name?.trim()) return res.status(400).json({ error: "Tên doanh nghiệp không được rỗng" });
      if (!email?.trim()) return res.status(400).json({ error: "Email không được rỗng" });
      if (!password || password.length < 8)
        return res.status(400).json({ error: "Mật khẩu phải tối thiểu 8 ký tự" });
      if (confirm_password && confirm_password !== password)
        return res.status(400).json({ error: "Mật khẩu xác nhận không khớp" });

      const existing = db.prepare("SELECT id FROM businesses WHERE email = ?").get(email);
      if (existing) return res.status(400).json({ error: "Email đã được sử dụng" });

      const hash = await bcrypt.hash(password, 10);
      const result = db
        .prepare("INSERT INTO businesses (name, email, password_hash) VALUES (?, ?, ?)")
        .run(name.trim(), email.trim(), hash);

      res.status(201).json({ message: "Đăng ký thành công" });
    } catch (e) {
      console.error("POST /api/auth/business/register:", e);
      res.status(500).json({ error: "Lỗi đăng ký" });
    }
  });

  // Business Login
  app.post("/api/auth/business/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: "Email và mật khẩu không được rỗng" });

      const biz = db
        .prepare("SELECT * FROM businesses WHERE email = ?")
        .get(email) as any;

      if (!biz) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

      const match = await bcrypt.compare(password, biz.password_hash);
      if (!match) return res.status(401).json({ error: "Email hoặc mật khẩu không đúng" });

      const token = jwt.sign(
        { business_id: biz.id, email: biz.email, role: "business" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        business: { id: biz.id, name: biz.name, email: biz.email },
      });
    } catch (e) {
      console.error("POST /api/auth/business/login:", e);
      res.status(500).json({ error: "Lỗi đăng nhập" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // END-USER (TOURIST) AUTH & DATA ROUTES
  // ═══════════════════════════════════════════════════════════════════════════

  app.post("/api/auth/user/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ error: "Thiếu thông tin bắt buộc" });

      const hash = await bcrypt.hash(password, 10);
      const info = db.prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)").run(name, email, hash);
      res.json({ success: true, user_id: info.lastInsertRowid });
    } catch (e: any) {
      if (e.message.includes("UNIQUE")) return res.status(400).json({ error: "Email đã tồn tại" });
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.post("/api/auth/user/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: "Thiếu credentials" });

      const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
      if (!user) return res.status(401).json({ error: "Sai email hoặc mật khẩu" });

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res.status(401).json({ error: "Sai email hoặc mật khẩu" });

      const token = jwt.sign({ id: user.id, role: "user" }, JWT_SECRET, { expiresIn: "7d" });
      res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (e) {
      res.status(500).json({ error: "Lỗi đăng nhập" });
    }
  });

  app.get("/api/user/pois/nearby", (req, res) => {
    try {
      const pois = db.prepare("SELECT * FROM pois").all();
      res.json(getPoisWithImages(pois)); // Fixed: Return POIs with their images
    } catch (e) {
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  app.get("/api/user/tours", (req, res) => {
    try {
      let userId: number | null = null;
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        try {
          const decoded: any = jwt.verify(token, JWT_SECRET);
          if (decoded.role === "user") userId = decoded.id;
        } catch (e) { /* Ignore invalid token for GET, just fallback to admin-only */ }
      }

      let rows: any[];
      if (userId) {
        // Lấy tour của admin HOẶC tour của chính user đó
        rows = db.prepare(`
          SELECT * FROM tours 
          WHERE created_by_type = 'admin' 
          OR (created_by_type = 'user' AND created_by_id = ?)
          ORDER BY created_at DESC
        `).all(userId) as any[];
      } else {
        // Khách (vãng lai) hoặc chưa đăng nhập: Chỉ thấy tour admin
        rows = db.prepare("SELECT * FROM tours WHERE created_by_type='admin' ORDER BY created_at DESC").all() as any[];
      }
      
      res.json(getToursWithDetails(rows));
    } catch (e) {
      console.error("GET /api/user/tours:", e);
      res.status(500).json({ error: "Lỗi hệ thống" });
    }
  });

  // POST Create User Tour
  app.post("/api/user/tours", userAuth, (req: any, res) => {
    const transaction = db.transaction((name: string, poiIds: number[], userId: number) => {
      // 1. Insert Tour
      const info = db.prepare(`
        INSERT INTO tours (name, created_by_type, created_by_id) 
        VALUES (?, 'user', ?)
      `).run(name, userId);
      
      const tourId = info.lastInsertRowid as number;

      // 2. Insert POIs
      const insertPoi = db.prepare(`
        INSERT INTO tour_pois (tour_id, poi_id, position) 
        VALUES (?, ?, ?)
      `);
      
      poiIds.forEach((poiId, idx) => {
        insertPoi.run(tourId, poiId, idx + 1);
      });

      return tourId;
    });

    try {
      const { name, poi_ids } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: "Tên tour không được rỗng" });
      if (!Array.isArray(poi_ids) || poi_ids.length === 0) 
        return res.status(400).json({ error: "Tour phải có ít nhất 1 điểm dừng" });

      const tourId = transaction(name.trim(), poi_ids, req.user_id);
      const created = db.prepare("SELECT * FROM tours WHERE id = ?").get(tourId);
      res.status(201).json(getToursWithDetails([created as any])[0]);
    } catch (e) {
      console.error("POST /api/user/tours:", e);
      res.status(500).json({ error: "Lỗi tạo tour" });
    }
  });

  // PUT Update User Tour (Ownership Required)
  app.put("/api/user/tours/:id", userAuth, (req: any, res) => {
    const tourId = parseInt(req.params.id);
    
    // Check ownership first
    const tour = db.prepare(`
      SELECT * FROM tours 
      WHERE id = ? AND created_by_type = 'user' AND created_by_id = ?
    `).get(tourId, req.user_id) as any;

    if (!tour) return res.status(403).json({ error: "Không có quyền chỉnh sửa tour này hoặc tour không tồn tại" });

    const transaction = db.transaction((name: string, poiIds: number[]) => {
      // 1. Update Name
      db.prepare("UPDATE tours SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(name, tourId);

      // 2. Refresh POIs (Delete and Re-insert)
      db.prepare("DELETE FROM tour_pois WHERE tour_id = ?").run(tourId);
      
      const insertPoi = db.prepare(`
        INSERT INTO tour_pois (tour_id, poi_id, position) 
        VALUES (?, ?, ?)
      `);
      
      poiIds.forEach((poiId, idx) => {
        insertPoi.run(tourId, poiId, idx + 1);
      });
    });

    try {
      const { name, poi_ids } = req.body;
      if (!name?.trim()) return res.status(400).json({ error: "Tên tour không được rỗng" });
      if (!Array.isArray(poi_ids) || poi_ids.length === 0) 
        return res.status(400).json({ error: "Tour phải có ít nhất 1 điểm dừng" });

      transaction(name.trim(), poi_ids);
      res.json({ success: true, message: "Cập nhật tour thành công" });
    } catch (e) {
      console.error("PUT /api/user/tours/:id:", e);
      res.status(500).json({ error: "Lỗi cập nhật tour" });
    }
  });

  // DELETE User Tour (Ownership Required)
  app.delete("/api/user/tours/:id", userAuth, (req: any, res) => {
    try {
      const tourId = parseInt(req.params.id);
      
      // Check ownership
      const tour = db.prepare(`
        SELECT * FROM tours 
        WHERE id = ? AND created_by_type = 'user' AND created_by_id = ?
      `).get(tourId, req.user_id) as any;

      if (!tour) return res.status(403).json({ error: "Không có quyền xóa tour này hoặc tour không tồn tại" });

      // Delete (CASCADE will handle tour_pois)
      db.prepare("DELETE FROM tours WHERE id = ?").run(tourId);
      
      res.json({ success: true, message: "Xóa tour thành công" });
    } catch (e) {
      console.error("DELETE /api/user/tours/:id:", e);
      res.status(500).json({ error: "Lỗi xóa tour" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIO ON DEMAND ROUTES
  // ═══════════════════════════════════════════════════════════════════════════

  app.post("/api/audio/generate", async (req, res) => {
    try {
      const { poi_id, language_code } = req.body;
      if (!poi_id || !language_code) return res.status(400).json({ error: "Missing poi_id or language_code" });

      const poi = db.prepare("SELECT * FROM pois WHERE id = ?").get(poi_id) as any;
      if (!poi) return res.status(404).json({ error: "POI not found" });

      const langRow = db.prepare("SELECT tts_voice FROM languages WHERE code=?").get(language_code) as any;
      if (!langRow) return res.status(400).json({ error: "Ngôn ngữ không được hỗ trợ" });
      const ttsVoice = langRow.tts_voice;

      let translatedText = poi.description;

      if (language_code !== "vi") {
        const existingTrans = db.prepare("SELECT * FROM poi_translations WHERE poi_id=? AND language_code=?").get(poi_id, language_code) as any;
        if (existingTrans) {
          translatedText = existingTrans.translated_description;
        } else {
          // deep_translator requires EXACTLY zh-CN for Chinese. For others, language_code is enough.
          const transLang = language_code === "zh" ? "zh-CN" : language_code;
          translatedText = await runPythonScript("translate.py", ["--text", poi.description, "--lang", transLang]);
          db.prepare("INSERT INTO poi_translations (poi_id, language_code, translated_description) VALUES (?, ?, ?)")
            .run(poi_id, language_code, translatedText);
        }
      }

      const highestVersionRecord = db.prepare("SELECT version FROM poi_audio_files WHERE poi_id=? ORDER BY version DESC LIMIT 1").get(poi_id) as any;
      const useVersion = highestVersionRecord ? highestVersionRecord.version : 0;

      const existingAudio = db.prepare("SELECT * FROM poi_audio_files WHERE poi_id=? AND language_code=? AND version=?").get(poi_id, language_code, useVersion) as any;
      
      if (existingAudio) {
        return res.json({ 
          success: true, already_existed: true, file_path: existingAudio.file_path, 
          translated_description: translatedText, audio_version: useVersion 
        });
      }

      const fileName = `poi_${poi_id}_${language_code}_v${useVersion}.mp3`;
      const absolutePath = path.join(audioDir, fileName);

      await runPythonScript("tts.py", ["--text", translatedText, "--voice", ttsVoice, "--output", absolutePath]);

      const publicFilePath = `/uploads/audio/${fileName}`;
      db.prepare("INSERT INTO poi_audio_files (poi_id, language_code, version, file_path) VALUES (?, ?, ?, ?)")
        .run(poi_id, language_code, useVersion, publicFilePath);

      res.json({
        success: true, already_existed: false, file_path: publicFilePath,
        translated_description: translatedText, audio_version: useVersion
      });
    } catch (err) {
      console.error("POST /api/audio/generate:", err);
      res.status(500).json({ error: "Server Internal Error" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN — DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/admin/dashboard/stats", adminAuth, (req, res) => {
    try {
      const total_users     = (db.prepare("SELECT COUNT(*) as c FROM users").get()     as any).c;
      const total_businesses= (db.prepare("SELECT COUNT(*) as c FROM businesses").get()as any).c;
      const total_pois      = (db.prepare("SELECT COUNT(*) as c FROM pois").get()      as any).c;
      const pois_by_admin   = (db.prepare("SELECT COUNT(*) as c FROM pois WHERE owner_type='admin'").get() as any).c;
      const pois_by_business= (db.prepare("SELECT COUNT(*) as c FROM pois WHERE owner_type='business'").get() as any).c;
      const total_tours     = (db.prepare("SELECT COUNT(*) as c FROM tours").get()     as any).c;
      const tours_by_admin  = (db.prepare("SELECT COUNT(*) as c FROM tours WHERE created_by_type='admin'").get() as any).c;
      const tours_by_user   = (db.prepare("SELECT COUNT(*) as c FROM tours WHERE created_by_type='user'").get()  as any).c;

      res.json({
        total_users,
        total_businesses,
        total_pois,
        pois_by_admin,
        pois_by_business,
        total_tours,
        tours_by_admin,
        tours_by_user,
      });
    } catch (e) {
      console.error("GET /api/admin/dashboard/stats:", e);
      res.status(500).json({ error: "Lỗi tải thống kê" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN — POI MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // GET all POIs (admin + business)
  app.get("/api/admin/pois", adminAuth, (req, res) => {
    try {
      const search = (req.query.search as string) || "";
      const rows = search
        ? (db
            .prepare("SELECT * FROM pois WHERE LOWER(name) LIKE LOWER(?) ORDER BY created_at DESC")
            .all(`%${search}%`) as any[])
        : (db.prepare("SELECT * FROM pois ORDER BY created_at DESC").all() as any[]);

      res.json(getPoisWithImages(rows));
    } catch (e) {
      console.error("GET /api/admin/pois:", e);
      res.status(500).json({ error: "Lỗi tải danh sách POI" });
    }
  });

  // POST create admin POI
  app.post(
    "/api/admin/pois",
    adminAuth,
    upload.array("images", 5),
    async (req: any, res) => {
      try {
        const { name, description, lat, lng, range_m } = req.body;

        if (!name?.trim())
          return res.status(400).json({ error: "Tên POI không được rỗng", fields: { name: "required" } });
        if (!description?.trim())
          return res.status(400).json({ error: "Mô tả không được rỗng", fields: { description: "required" } });

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        if (isNaN(latNum) || latNum < -90 || latNum > 90)
          return res.status(400).json({ error: "Vĩ độ không hợp lệ" });
        if (isNaN(lngNum) || lngNum < -180 || lngNum > 180)
          return res.status(400).json({ error: "Kinh độ không hợp lệ" });

        const rangeNum = range_m ? parseInt(range_m) : 1;

        const info = db
          .prepare(
            "INSERT INTO pois (name, description, lat, lng, range_m, owner_type, owner_id) VALUES (?, ?, ?, ?, ?, 'admin', ?)"
          )
          .run(name.trim(), description.trim(), latNum, lngNum, rangeNum, req.admin_id);

        const poiId = info.lastInsertRowid as number;

        // Insert images
        const files = (req.files as Express.Multer.File[]) || [];
        files.forEach((f, idx) => {
          db.prepare(
            "INSERT INTO poi_images (poi_id, file_path, sort_order) VALUES (?, ?, ?)"
          ).run(poiId, `/uploads/pois/${f.filename}`, idx);
        });

        // Gọi TTS sinh audio không chặn (Async)
        generateAudio(poiId, description.trim());

        const created = db.prepare("SELECT * FROM pois WHERE id = ?").get(poiId) as any;
        const images  = db.prepare("SELECT * FROM poi_images WHERE poi_id = ?").all(poiId) as any[];
        res.status(201).json({ ...created, images, audio_files: [], translations: [] });
      } catch (e) {
        console.error("POST /api/admin/pois:", e);
        res.status(500).json({ error: "Lỗi tạo POI" });
      }
    }
  );

  // PUT update admin POI
  app.put(
    "/api/admin/pois/:id",
    adminAuth,
    upload.array("new_images", 5),
    async (req: any, res) => {
      try {
        const poiId = parseInt(req.params.id);
        const poi = db.prepare("SELECT * FROM pois WHERE id = ?").get(poiId) as any;
        if (!poi) return res.status(404).json({ error: "POI không tồn tại" });
        if (poi.owner_type !== "admin" || poi.owner_id !== req.admin_id)
          return res.status(403).json({ error: "Không có quyền sửa POI này" });

        const { name, description, lat, lng, range_m, delete_image_ids } = req.body;

        const latNum  = lat  !== undefined ? parseFloat(lat)  : poi.lat;
        const lngNum  = lng  !== undefined ? parseFloat(lng)  : poi.lng;
        const rangeNum= range_m !== undefined ? parseInt(range_m) : poi.range_m;
        const nameVal = name?.trim() || poi.name;
        const descVal = description?.trim() || poi.description;

        db.prepare(
          "UPDATE pois SET name=?, description=?, lat=?, lng=?, range_m=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
        ).run(nameVal, descVal, latNum, lngNum, rangeNum, poiId);

        // Handle image deletions
        if (delete_image_ids) {
          const ids: number[] = Array.isArray(delete_image_ids)
            ? delete_image_ids.map(Number)
            : [Number(delete_image_ids)];
          for (const imgId of ids) {
            const img = db.prepare("SELECT file_path FROM poi_images WHERE id=? AND poi_id=?").get(imgId, poiId) as any;
            if (img) {
              deleteFile(img.file_path);
              db.prepare("DELETE FROM poi_images WHERE id=?").run(imgId);
            }
          }
        }

        // Add new images
        const files = (req.files as Express.Multer.File[]) || [];
        const currentCount = (db.prepare("SELECT COUNT(*) as c FROM poi_images WHERE poi_id=?").get(poiId) as any).c;
        const allowedNew = 5 - currentCount;
        files.slice(0, allowedNew).forEach((f, idx) => {
          db.prepare(
            "INSERT INTO poi_images (poi_id, file_path, sort_order) VALUES (?, ?, ?)"
          ).run(poiId, `/uploads/pois/${f.filename}`, currentCount + idx);
        });

        // AUDIO VERSIONING (Cache Invalidation)
        const highestVerRow = db.prepare("SELECT version FROM poi_audio_files WHERE poi_id=? ORDER BY version DESC LIMIT 1").get(poiId) as any;
        const newVersion = (highestVerRow ? highestVerRow.version : 0) + 1;
        
        // Delete all old audio files & translations
        const oldAudios = db.prepare("SELECT file_path FROM poi_audio_files WHERE poi_id=?").all(poiId) as any[];
        oldAudios.forEach((a) => deleteFile(a.file_path));
        db.prepare("DELETE FROM poi_audio_files WHERE poi_id=?").run(poiId);
        db.prepare("DELETE FROM poi_translations WHERE poi_id=?").run(poiId);

        // Generate new Vietnamese audio async
        const newFileName = `poi_${poiId}_vi_v${newVersion}.mp3`;
        const newRelPath = `/uploads/audio/${newFileName}`;
        const newAbsPath = path.join(audioDir, newFileName);
        
        const langRow = db.prepare("SELECT tts_voice FROM languages WHERE code='vi'").get() as any;
        const viVoice = langRow ? langRow.tts_voice : 'vi-VN-HoaiMyNeural';
        const pyProcess = spawn("python", ["scripts/tts.py", "--text", descVal, "--voice", viVoice, "--output", newAbsPath]);
        pyProcess.on("close", (code) => {
          if (code === 0) {
            db.prepare("INSERT INTO poi_audio_files (poi_id, language_code, version, file_path) VALUES (?, 'vi', ?, ?)").run(poiId, newVersion, newRelPath);
          }
        });

        res.json({ success: true, audio_version: newVersion });
      } catch (e) {
        console.error("PUT /api/admin/pois/:id:", e);
        res.status(500).json({ error: "Lỗi cập nhật POI" });
      }
    }
  );

  // DELETE admin POI
  app.delete("/api/admin/pois/:id", adminAuth, (req: any, res) => {
    try {
      const poiId = parseInt(req.params.id);
      const poi = db.prepare("SELECT * FROM pois WHERE id = ?").get(poiId) as any;
      if (!poi) return res.status(404).json({ error: "POI không tồn tại" });

      // Check if POI is in any tour
      const tours = db
        .prepare(
          `SELECT t.id, t.name FROM tour_pois tp
           JOIN tours t ON t.id = tp.tour_id
           WHERE tp.poi_id = ?`
        )
        .all(poiId) as any[];
      if (tours.length > 0)
        return res.status(409).json({
          error: "Không thể xóa POI đang nằm trong Tour",
          tours: tours.map((t) => ({ id: t.id, name: t.name })),
        });

      // Delete images
      const images = db.prepare("SELECT file_path FROM poi_images WHERE poi_id=?").all(poiId) as any[];
      images.forEach((img) => deleteFile(img.file_path));

      // Delete audio files
      const audios = db.prepare("SELECT file_path FROM poi_audio_files WHERE poi_id=?").all(poiId) as any[];
      audios.forEach((a) => deleteFile(a.file_path));

      db.prepare("DELETE FROM pois WHERE id=?").run(poiId);
      res.json({ success: true });
    } catch (e) {
      console.error("DELETE /api/admin/pois/:id:", e);
      res.status(500).json({ error: "Lỗi xóa POI" });
    }
  });

// DELETE business POI (by admin)
app.delete("/api/admin/pois/business/:poi_id", adminAuth, (req: any, res) => {
  try {
    const poiId = parseInt(req.params.poi_id);

    // BƯỚC 1: Phải lấy đường dẫn file TRƯỚC khi chạm vào bất kỳ lệnh DELETE nào
    const images = db.prepare("SELECT file_path FROM poi_images WHERE poi_id=?").all(poiId) as any[];
    const audios = db.prepare("SELECT file_path FROM poi_audio_files WHERE poi_id=?").all(poiId) as any[];

    const poi = db.prepare("SELECT id FROM pois WHERE id=? AND owner_type='business'").get(poiId) as any;
    if (!poi) return res.status(404).json({ error: "POI không tồn tại" });

    // BƯỚC 2: Kiểm tra Tour (giữ nguyên)
    const tours = db.prepare(`SELECT t.id FROM tour_pois tp JOIN tours t ON t.id = tp.tour_id WHERE tp.poi_id = ?`).all(poiId);
    if (tours.length > 0) return res.status(409).json({ error: "POI đang trong Tour", tours });

    // BƯỚC 3: Xóa file vật lý bằng danh sách đã lấy ở Bước 1
    images.forEach((img) => deleteFile(img.file_path));
    audios.forEach((audio) => deleteFile(audio.file_path));

    // BƯỚC 4: Cuối cùng mới xóa DB (Lúc này CASCADE mới kích hoạt)
    db.prepare("DELETE FROM pois WHERE id=?").run(poiId);

    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Lỗi xóa POI doanh nghiệp" });
  }
});
  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN — TOUR MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  // GET all tours
  app.get("/api/admin/tours", adminAuth, (_req, res) => {
    try {
      const rows = db
        .prepare("SELECT * FROM tours WHERE created_by_type='admin' ORDER BY created_at DESC")
        .all() as any[];
      res.json(getToursWithDetails(rows));
    } catch (e) {
      console.error("GET /api/admin/tours:", e);
      res.status(500).json({ error: "Lỗi tải danh sách Tour" });
    }
  });

  // POST create tour
  app.post(
    "/api/admin/tours",
    adminAuth,
    upload.array("images", 5),
    (req: any, res) => {
      try {
        const { name, description, poi_ids } = req.body;
        if (!name?.trim())
          return res.status(400).json({ error: "Tên Tour không được rỗng" });

        let poiIdsArr: number[] = [];
        try {
          poiIdsArr = JSON.parse(poi_ids || "[]");
        } catch {
          return res.status(400).json({ error: "poi_ids không hợp lệ" });
        }
        if (!poiIdsArr.length)
          return res.status(400).json({ error: "Tour phải có ít nhất 1 POI" });

        const info = db
          .prepare(
            "INSERT INTO tours (name, description, created_by_type, created_by_id) VALUES (?, ?, 'admin', ?)"
          )
          .run(name.trim(), description?.trim() || null, req.admin_id);

        const tourId = info.lastInsertRowid as number;

        // Insert tour_pois
        poiIdsArr.forEach((poiId, idx) => {
          db.prepare("INSERT INTO tour_pois (tour_id, poi_id, position) VALUES (?, ?, ?)").run(
            tourId, poiId, idx + 1
          );
        });

        // Insert images
        const files = (req.files as Express.Multer.File[]) || [];
        files.forEach((f, idx) => {
          db.prepare(
            "INSERT INTO tour_images (tour_id, file_path, sort_order) VALUES (?, ?, ?)"
          ).run(tourId, `/uploads/tours/${f.filename}`, idx);
        });

        const created = db.prepare("SELECT * FROM tours WHERE id=?").get(tourId);
        res.status(201).json(
          getToursWithDetails([created as any])[0]
        );
      } catch (e) {
        console.error("POST /api/admin/tours:", e);
        res.status(500).json({ error: "Lỗi tạo Tour" });
      }
    }
  );

  // PUT update tour
  app.put(
    "/api/admin/tours/:id",
    adminAuth,
    upload.array("new_images", 5),
    (req: any, res) => {
      try {
        const tourId = parseInt(req.params.id);
        const tour = db.prepare("SELECT * FROM tours WHERE id=?").get(tourId) as any;
        if (!tour) return res.status(404).json({ error: "Tour không tồn tại" });

        const { name, description, poi_ids, delete_image_ids } = req.body;

        db.prepare(
          "UPDATE tours SET name=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
        ).run(
          name?.trim() || tour.name,
          description !== undefined ? (description?.trim() || null) : tour.description,
          tourId
        );

        // Update POIs if provided
        if (poi_ids !== undefined) {
          let poiIdsArr: number[] = [];
          try { poiIdsArr = JSON.parse(poi_ids); } catch {}
          db.prepare("DELETE FROM tour_pois WHERE tour_id=?").run(tourId);
          poiIdsArr.forEach((poiId, idx) => {
            db.prepare("INSERT INTO tour_pois (tour_id, poi_id, position) VALUES (?, ?, ?)").run(
              tourId, poiId, idx + 1
            );
          });
        }

        // Handle image deletions
        if (delete_image_ids) {
          const ids: number[] = Array.isArray(delete_image_ids)
            ? delete_image_ids.map(Number)
            : [Number(delete_image_ids)];
          for (const imgId of ids) {
            const img = db.prepare("SELECT file_path FROM tour_images WHERE id=? AND tour_id=?").get(imgId, tourId) as any;
            if (img) {
              deleteFile(img.file_path);
              db.prepare("DELETE FROM tour_images WHERE id=?").run(imgId);
            }
          }
        }

        // Add new images
        const files = (req.files as Express.Multer.File[]) || [];
        const currentCount = (db.prepare("SELECT COUNT(*) as c FROM tour_images WHERE tour_id=?").get(tourId) as any).c;
        files.slice(0, 5 - currentCount).forEach((f, idx) => {
          db.prepare("INSERT INTO tour_images (tour_id, file_path, sort_order) VALUES (?, ?, ?)").run(
            tourId, `/uploads/tours/${f.filename}`, currentCount + idx
          );
        });

        res.json({ success: true });
      } catch (e) {
        console.error("PUT /api/admin/tours/:id:", e);
        res.status(500).json({ error: "Lỗi cập nhật Tour" });
      }
    }
  );

  // DELETE tour
  app.delete("/api/admin/tours/:id", adminAuth, (_req, res) => {
    try {
      const tourId = parseInt(_req.params.id);
      const tour = db.prepare("SELECT * FROM tours WHERE id=?").get(tourId) as any;
      if (!tour) return res.status(404).json({ error: "Tour không tồn tại" });

      const images = db.prepare("SELECT file_path FROM tour_images WHERE tour_id=?").all(tourId) as any[];
      images.forEach((img) => deleteFile(img.file_path));

      db.prepare("DELETE FROM tours WHERE id=?").run(tourId);
      res.json({ success: true });
    } catch (e) {
      console.error("DELETE /api/admin/tours/:id:", e);
      res.status(500).json({ error: "Lỗi xóa Tour" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN — BUSINESS MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/admin/businesses", adminAuth, (req, res) => {
    try {
      const search = (req.query.search as string) || "";
      const rows = search
        ? (db
            .prepare(
              `SELECT b.*, (SELECT COUNT(*) FROM pois p WHERE p.owner_id=b.id AND p.owner_type='business') as poi_count
               FROM businesses b WHERE LOWER(b.name) LIKE LOWER(?) ORDER BY b.created_at DESC`
            )
            .all(`%${search}%`) as any[])
        : (db
            .prepare(
              `SELECT b.*, (SELECT COUNT(*) FROM pois p WHERE p.owner_id=b.id AND p.owner_type='business') as poi_count
               FROM businesses b ORDER BY b.created_at DESC`
            )
            .all() as any[]);

      res.json(rows.map((b) => ({ id: b.id, name: b.name, email: b.email, created_at: b.created_at, poi_count: b.poi_count })));
    } catch (e) {
      console.error("GET /api/admin/businesses:", e);
      res.status(500).json({ error: "Lỗi tải danh sách doanh nghiệp" });
    }
  });

  app.get("/api/admin/businesses/:id", adminAuth, (req, res) => {
    try {
      const bizId = parseInt(req.params.id);
      const biz = db.prepare("SELECT id, name, email, created_at FROM businesses WHERE id=?").get(bizId) as any;
      if (!biz) return res.status(404).json({ error: "Doanh nghiệp không tồn tại" });

      const poiRows = db
        .prepare("SELECT * FROM pois WHERE owner_type='business' AND owner_id=? ORDER BY created_at DESC")
        .all(bizId) as any[];

      res.json({ ...biz, pois: getPoisWithImages(poiRows) });
    } catch (e) {
      console.error("GET /api/admin/businesses/:id:", e);
      res.status(500).json({ error: "Lỗi tải thông tin doanh nghiệp" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BUSINESS — POI MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/business/pois", businessAuth, (req: any, res) => {
    try {
      const search = (req.query.search as string) || "";
      const rows = search
        ? (db
            .prepare(
              "SELECT * FROM pois WHERE owner_type='business' AND owner_id=? AND LOWER(name) LIKE LOWER(?) ORDER BY created_at DESC"
            )
            .all(req.business_id, `%${search}%`) as any[])
        : (db
            .prepare(
              "SELECT * FROM pois WHERE owner_type='business' AND owner_id=? ORDER BY created_at DESC"
            )
            .all(req.business_id) as any[]);

      res.json(getPoisWithImages(rows));
    } catch (e) {
      console.error("GET /api/business/pois:", e);
      res.status(500).json({ error: "Lỗi tải danh sách POI" });
    }
  });

  app.post(
    "/api/business/pois",
    businessAuth,
    upload.array("images", 5),
    async (req: any, res) => {
      try {
        const { name, description, lat, lng, range_m } = req.body;

        if (!name?.trim())
          return res.status(400).json({ error: "Tên POI không được rỗng" });
        if (!description?.trim())
          return res.status(400).json({ error: "Mô tả không được rỗng" });

        const latNum  = parseFloat(lat);
        const lngNum  = parseFloat(lng);
        if (isNaN(latNum) || latNum < -90 || latNum > 90)
          return res.status(400).json({ error: "Vĩ độ không hợp lệ" });
        if (isNaN(lngNum) || lngNum < -180 || lngNum > 180)
          return res.status(400).json({ error: "Kinh độ không hợp lệ" });

        const rangeNum = range_m ? parseInt(range_m) : 1;

        const info = db
          .prepare(
            "INSERT INTO pois (name, description, lat, lng, range_m, owner_type, owner_id) VALUES (?, ?, ?, ?, ?, 'business', ?)"
          )
          .run(name.trim(), description.trim(), latNum, lngNum, rangeNum, req.business_id);

        const poiId = info.lastInsertRowid as number;

        const files = (req.files as Express.Multer.File[]) || [];
        files.forEach((f, idx) => {
          db.prepare("INSERT INTO poi_images (poi_id, file_path, sort_order) VALUES (?, ?, ?)").run(
            poiId, `/uploads/pois/${f.filename}`, idx
          );
        });

        // Gọi TTS sinh audio không chặn (Async)
        generateAudio(poiId, description.trim());

        const created = db.prepare("SELECT * FROM pois WHERE id=?").get(poiId) as any;
        const images  = db.prepare("SELECT * FROM poi_images WHERE poi_id=?").all(poiId) as any[];
        res.status(201).json({ ...created, images, audio_files: [], translations: [] });
      } catch (e) {
        console.error("POST /api/business/pois:", e);
        res.status(500).json({ error: "Lỗi tạo POI" });
      }
    }
  );

  app.put(
    "/api/business/pois/:id",
    businessAuth,
    upload.array("new_images", 5),
    async (req: any, res) => {
      try {
        const poiId = parseInt(req.params.id);
        const poi = db
          .prepare("SELECT * FROM pois WHERE id=? AND owner_type='business' AND owner_id=?")
          .get(poiId, req.business_id) as any;
        if (!poi) return res.status(403).json({ error: "Không có quyền sửa POI này" });

        const { name, description, lat, lng, range_m, delete_image_ids } = req.body;

        db.prepare(
          "UPDATE pois SET name=?, description=?, lat=?, lng=?, range_m=?, updated_at=CURRENT_TIMESTAMP WHERE id=?"
        ).run(
          name?.trim() || poi.name,
          description?.trim() || poi.description,
          lat !== undefined ? parseFloat(lat) : poi.lat,
          lng !== undefined ? parseFloat(lng) : poi.lng,
          range_m !== undefined ? parseInt(range_m) : poi.range_m,
          poiId
        );

        if (delete_image_ids) {
          const ids: number[] = Array.isArray(delete_image_ids)
            ? delete_image_ids.map(Number)
            : [Number(delete_image_ids)];
          for (const imgId of ids) {
            const img = db.prepare("SELECT file_path FROM poi_images WHERE id=? AND poi_id=?").get(imgId, poiId) as any;
            if (img) {
              deleteFile(img.file_path);
              db.prepare("DELETE FROM poi_images WHERE id=?").run(imgId);
            }
          }
        }

        const files = (req.files as Express.Multer.File[]) || [];
        const currentCount = (db.prepare("SELECT COUNT(*) as c FROM poi_images WHERE poi_id=?").get(poiId) as any).c;
        files.slice(0, 5 - currentCount).forEach((f, idx) => {
          db.prepare("INSERT INTO poi_images (poi_id, file_path, sort_order) VALUES (?, ?, ?)").run(
            poiId, `/uploads/pois/${f.filename}`, currentCount + idx
          );
        });

        // AUDIO VERSIONING (Cache Invalidation)
        const highestVerRow = db.prepare("SELECT version FROM poi_audio_files WHERE poi_id=? ORDER BY version DESC LIMIT 1").get(poiId) as any;
        const newVersion = (highestVerRow ? highestVerRow.version : 0) + 1;
        
        // Delete all old audio files & translations
        const oldAudios = db.prepare("SELECT file_path FROM poi_audio_files WHERE poi_id=?").all(poiId) as any[];
        oldAudios.forEach((a) => deleteFile(a.file_path));
        db.prepare("DELETE FROM poi_audio_files WHERE poi_id=?").run(poiId);
        db.prepare("DELETE FROM poi_translations WHERE poi_id=?").run(poiId);

        // Generate new Vietnamese audio async
        const newDesc = description?.trim() || poi.description;
        const newFileName = `poi_${poiId}_vi_v${newVersion}.mp3`;
        const newRelPath = `/uploads/audio/${newFileName}`;
        const newAbsPath = path.join(audioDir, newFileName);
        
        const langRow = db.prepare("SELECT tts_voice FROM languages WHERE code='vi'").get() as any;
        const viVoice = langRow ? langRow.tts_voice : 'vi-VN-HoaiMyNeural';
        const pyProcess = spawn("python", ["scripts/tts.py", "--text", newDesc, "--voice", viVoice, "--output", newAbsPath]);
        pyProcess.on("close", (code) => {
          if (code === 0) {
            db.prepare("INSERT INTO poi_audio_files (poi_id, language_code, version, file_path) VALUES (?, 'vi', ?, ?)").run(poiId, newVersion, newRelPath);
          }
        });

        res.json({ success: true, audio_version: newVersion });
      } catch (e) {
        console.error("PUT /api/business/pois/:id:", e);
        res.status(500).json({ error: "Lỗi cập nhật POI" });
      }
    }
  );

app.delete("/api/business/pois/:id", businessAuth, (req: any, res) => {
  try {
    const poiId = parseInt(req.params.id);

    // BƯỚC 1: Kiểm tra quyền sở hữu và lấy data TRƯỚC
    const poi = db
      .prepare("SELECT * FROM pois WHERE id=? AND owner_type='business' AND owner_id=?")
      .get(poiId, req.business_id) as any;
    
    if (!poi) return res.status(403).json({ error: "Không có quyền xóa POI này hoặc POI không tồn tại" });

    // BƯỚC 2: Lấy danh sách file vật lý TRƯỚC khi xóa DB
    const images = db.prepare("SELECT file_path FROM poi_images WHERE poi_id=?").all(poiId) as any[];
    const audios = db.prepare("SELECT file_path FROM poi_audio_files WHERE poi_id=?").all(poiId) as any[];

    // BƯỚC 3: Kiểm tra Tour (giữ nguyên)
    const tours = db
      .prepare(
        `SELECT t.id, t.name FROM tour_pois tp
         JOIN tours t ON t.id = tp.tour_id WHERE tp.poi_id = ?`
      )
      .all(poiId) as any[];
      
    if (tours.length > 0)
      return res.status(409).json({
        error: "Không thể xóa POI đang nằm trong Tour",
        tours,
      });

    // BƯỚC 4: Xóa file vật lý
    images.forEach((img) => deleteFile(img.file_path));
    audios.forEach((audio) => deleteFile(audio.file_path));

    // BƯỚC 5: Xóa trong Database (Lúc này các bảng liên quan sẽ tự động CASCADE)
    db.prepare("DELETE FROM pois WHERE id=?").run(poiId);

    res.json({ success: true, message: "Doanh nghiệp đã xóa POI thành công" });
  } catch (e) {
    console.error("DELETE /api/business/pois/:id:", e);
    res.status(500).json({ error: "Lỗi hệ thống khi xóa POI" });
  }
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      // Kiểm tra IPv4 và không phải là card mạng ảo/nội bộ
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}
// ── SPA fallback ──────────────────────────────────────────────────────────
  app.use(express.static(path.join(__dirname, "dist")));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });

  // ── Khởi chạy Server và hiện QR ───────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  // const localIp = getLocalIp();
  // // CHÚ Ý: Đổi PORT ở đây thành 5173 để điện thoại vào đúng server Vite
  // const FRONTEND_URL = `http://${localIp}:5173/app`; 

  // console.log("\n" + "=".repeat(50));
  // console.log(`📱 QUÉT MÃ QR ĐỂ MỞ APP USER (CỔNG 5173)`);
  // console.log(`🔗 Link: ${FRONTEND_URL}`);
  
  // Hiện mã QR trỏ thẳng về cổng 5173
  // qrcode.generate(FRONTEND_URL, { small: true });
  // Sửa lại đoạn này
const NGROK_URL = "https://unbribable-jettingly-winifred.ngrok-free.dev"; // Dán cái link ngrok bạn vừa lấy được vào đây
qrcode.generate(NGROK_URL, { small: true });
  
  console.log("=".repeat(50) + "\n");
});
} // <--- Dấu ngoặc này đóng hàm startServer

// Chạy hàm khởi tạo
startServer().catch(console.error);