import express from "express";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("data.db");

// Auth config
const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-key-change-in-production";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS pois (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS tours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    poi_ids TEXT NOT NULL
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Middleware to check auth
  const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      jwt.verify(token, JWT_SECRET);
      next();
    } catch {
      res.status(401).json({ error: "Invalid token" });
    }
  };

  // API Routes

  // Auth
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;

    // Simple validation for MVP (production: use hashed password)
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: "24h" });
      res.json({ token });
    } else {
      res.status(401).json({ error: "Sai email hoặc mật khẩu" });
    }
  });

  // POIs
  app.get("/api/pois", authMiddleware, (req, res) => {
    try {
      const pois = db.prepare("SELECT * FROM pois").all();
      const formatted = pois.map((p: any) => ({
        ...p,
      }));
      res.json(formatted);
    } catch (error) {
      console.error("GET /api/pois error:", error);
      res.status(500).json({ error: "Lỗi tải POI" });
    }
  });

  app.post("/api/pois", authMiddleware, (req, res) => {
    try {
      const { name, type, lat, lng, description } = req.body;

      // ✅ FIX: Validate POI data
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "POI name không được rỗng" });
      }

      if (
        !type ||
        !["Chính", "WC", "Bán vé", "Gửi xe", "Bến thuyền"].includes(type)
      ) {
        return res.status(400).json({ error: "POI type không hợp lệ" });
      }

      if (typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ error: "Tọa độ phải là số" });
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: "Tọa độ ngoài phạm vi hợp lệ" });
      }

      const info = db
        .prepare(
          "INSERT INTO pois (name, type, lat, lng, description) VALUES (?, ?, ?, ?, ?)",
        )
        .run(name, type, lat, lng, description || null);

      res.status(201).json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error("POST /api/pois error:", error);
      res.status(500).json({ error: "Lỗi tạo POI" });
    }
  });

  app.put("/api/pois/:id", authMiddleware, (req, res) => {
    try {
      const { name, type, lat, lng, description } = req.body;

      // ✅ FIX: Validate POI data
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "POI name không được rỗng" });
      }

      if (
        !type ||
        !["Chính", "WC", "Bán vé", "Gửi xe", "Bến thuyền"].includes(type)
      ) {
        return res.status(400).json({ error: "POI type không hợp lệ" });
      }

      if (typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ error: "Tọa độ phải là số" });
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({ error: "Tọa độ ngoài phạm vi hợp lệ" });
      }

      db.prepare(
        "UPDATE pois SET name = ?, type = ?, lat = ?, lng = ?, description = ? WHERE id = ?",
      ).run(name, type, lat, lng, description || null, req.params.id);

      res.json({ success: true });
    } catch (error) {
      console.error("PUT /api/pois/:id error:", error);
      res.status(500).json({ error: "Lỗi cập nhật POI" });
    }
  });

  app.delete("/api/pois/:id", authMiddleware, (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "POI ID không hợp lệ" });
      }

      db.prepare("DELETE FROM pois WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("DELETE /api/pois/:id error:", error);
      res.status(500).json({ error: "Lỗi xóa POI" });
    }
  });

  // Tours
  app.get("/api/tours", authMiddleware, (req, res) => {
    try {
      const tours = db.prepare("SELECT * FROM tours").all();
      const formattedTours = tours.map((t: any) => ({
        ...t,
        poi_ids: JSON.parse(t.poi_ids as string),
      }));
      res.json(formattedTours);
    } catch (error) {
      console.error("GET /api/tours error:", error);
      res.status(500).json({ error: "Lỗi tải Tour" });
    }
  });

  app.post("/api/tours", authMiddleware, (req, res) => {
    try {
      const { title, poi_ids } = req.body;

      // ✅ FIX: Validate input trước khi insert
      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Tour title không được rỗng" });
      }

      if (!Array.isArray(poi_ids) || poi_ids.length === 0) {
        return res.status(400).json({ error: "Tour phải chứa ít nhất 1 POI" });
      }

      // ✅ FIX #4: Validate all POI IDs exist in database (NFR-VAL-05)
      const allPois = db.prepare("SELECT id FROM pois").all() as Array<{
        id: number;
      }>;
      const validPoiIds = new Set(allPois.map((p: any) => p.id));
      const invalidIds = poi_ids.filter((id: number) => !validPoiIds.has(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          error: `POI IDs không tồn tại: ${invalidIds.join(", ")}`,
        });
      }

      const info = db
        .prepare("INSERT INTO tours (title, poi_ids) VALUES (?, ?)")
        .run(title, JSON.stringify(poi_ids));

      res.status(201).json({ id: info.lastInsertRowid });
    } catch (error) {
      console.error("POST /api/tours error:", error);
      res.status(500).json({ error: "Lỗi tạo tour" });
    }
  });

  app.put("/api/tours/:id", authMiddleware, (req, res) => {
    try {
      const { title, poi_ids } = req.body;

      // ✅ FIX: Validate input
      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Tour title không được rỗng" });
      }

      if (!Array.isArray(poi_ids) || poi_ids.length === 0) {
        return res.status(400).json({ error: "Tour phải chứa ít nhất 1 POI" });
      }

      // ✅ FIX #4: Validate all POI IDs exist in database (NFR-VAL-05)
      const allPois = db.prepare("SELECT id FROM pois").all() as Array<{
        id: number;
      }>;
      const validPoiIds = new Set(allPois.map((p: any) => p.id));
      const invalidIds = poi_ids.filter((id: number) => !validPoiIds.has(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({
          error: `POI IDs không tồn tại: ${invalidIds.join(", ")}`,
        });
      }

      db.prepare("UPDATE tours SET title = ?, poi_ids = ? WHERE id = ?").run(
        title,
        JSON.stringify(poi_ids),
        req.params.id,
      );
      res.json({ success: true });
    } catch (error) {
      console.error("PUT /api/tours/:id error:", error);
      res.status(500).json({ error: "Lỗi cập nhật tour" });
    }
  });

  app.delete("/api/tours/:id", authMiddleware, (req, res) => {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ error: "Tour ID không hợp lệ" });
      }

      db.prepare("DELETE FROM tours WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("DELETE /api/tours/:id error:", error);
      res.status(500).json({ error: "Lỗi xóa tour" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      plugins: [],
      define: {
        "process.env.GEMINI_API_KEY": JSON.stringify(
          process.env.GEMINI_API_KEY || "",
        ),
      },
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
