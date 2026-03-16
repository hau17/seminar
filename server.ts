import express from "express";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import multer from "multer";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("data.db");

// ✅ FIX #10: Setup file upload storage for images (FR-02.9, FR-03.4)
const uploadsDir = path.join(__dirname, "public", "uploads");
const poisDir = path.join(uploadsDir, "pois");
const toursDir = path.join(uploadsDir, "tours");

if (!fs.existsSync(poisDir)) {
  fs.mkdirSync(poisDir, { recursive: true });
}
if (!fs.existsSync(toursDir)) {
  fs.mkdirSync(toursDir, { recursive: true });
}

// ✅ PHASE 1 C1, C6: Multer storage with dynamic destination (pois vs tours)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const folder = req.path.includes("/pois") ? poisDir : toursDir;
    cb(null, folder);
  },
  filename: (req, file, cb) => {
    // Filename format: uuid-style unique name
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error("Chỉ chấp nhận file JPG, PNG, WebP"));
    }
    cb(null, true);
  },
});

// Auth config
const JWT_SECRET =
  process.env.JWT_SECRET || "dev-secret-key-change-in-production";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "password";

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS pois (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    description TEXT,
    radius INTEGER DEFAULT 0,
    image TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    image TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tour_pois (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tour_id INTEGER NOT NULL,
    poi_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
    FOREIGN KEY (poi_id) REFERENCES pois(id) ON DELETE CASCADE,
    UNIQUE (tour_id, position)
  );
`);

// ✅ Create index for tour_pois query
try {
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_tour_pois_tour ON tour_pois(tour_id, position);`,
  );
  console.log("[INDEX] Created idx_tour_pois_tour");
} catch (e) {
  // Index already exists
}

try {
  db.exec(`CREATE INDEX IF NOT EXISTS idx_tour_pois_poi ON tour_pois(poi_id);`);
  console.log("[INDEX] Created idx_tour_pois_poi");
} catch (e) {
  // Index already exists
}

// ✅ PHASE 1 C3: Migrate to new schema - add radius and image columns
try {
  db.exec(`ALTER TABLE pois ADD COLUMN radius INTEGER NOT NULL DEFAULT 0;`);
  console.log("[MIGRATION] Added radius column to pois");
} catch (e) {
  // Column already exists
}
try {
  db.exec(`ALTER TABLE pois ADD COLUMN image TEXT;`);
  console.log("[MIGRATION] Added image column to pois");
} catch (e) {
  // Column already exists
}
try {
  db.exec(`ALTER TABLE tours ADD COLUMN image TEXT;`);
  console.log("[MIGRATION] Added image column to tours");
} catch (e) {
  // Column already exists
}
try {
  db.exec(`ALTER TABLE tours ADD COLUMN description TEXT;`);
  console.log("[MIGRATION] Added description column to tours");
} catch (e) {
  // Column already exists
}

// ✅ v1.4: Migrate audit timestamps
try {
  db.exec(
    `ALTER TABLE pois ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
  );
  console.log("[MIGRATION] Added created_at column to pois");
} catch (e) {
  // Column already exists
}
try {
  db.exec(
    `ALTER TABLE pois ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
  );
  console.log("[MIGRATION] Added updated_at column to pois");
} catch (e) {
  // Column already exists
}
try {
  db.exec(
    `ALTER TABLE tours ADD COLUMN created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
  );
  console.log("[MIGRATION] Added created_at column to tours");
} catch (e) {
  // Column already exists
}
try {
  db.exec(
    `ALTER TABLE tours ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;`,
  );
  console.log("[MIGRATION] Added updated_at column to tours");
} catch (e) {
  // Column already exists
}

// ✅ PHASE 2 C10, C14: Migrate existing tour poi_ids JSON to tour_pois table (one-time)
try {
  const existingTourPois =
    (db.prepare("SELECT COUNT(*) as cnt FROM tour_pois").get() as any)?.cnt ||
    0;

  if (existingTourPois === 0) {
    console.log("[MIGRATION] Starting tour_pois migration from JSON...");
    const tours = db
      .prepare("SELECT id, poi_ids FROM tours WHERE poi_ids != ''")
      .all() as Array<{
      id: number;
      poi_ids: string;
    }>;

    let migratedCount = 0;
    for (const tour of tours) {
      try {
        const poi_ids = JSON.parse(tour.poi_ids);
        if (Array.isArray(poi_ids) && poi_ids.length > 0) {
          poi_ids.forEach((poi_id: number, index: number) => {
            db.prepare(
              "INSERT INTO tour_pois (tour_id, poi_id, position) VALUES (?, ?, ?)",
            ).run(tour.id, poi_id, index + 1);
          });
          migratedCount++;
        }
      } catch (e) {
        console.warn(`[MIGRATION] Warning parsing tour ${tour.id}: ${e}`);
      }
    }
    console.log(
      `[MIGRATION] Successfully migrated ${migratedCount} tours to tour_pois table`,
    );
  }
} catch (e) {
  console.log("[MIGRATION] tour_pois migration skipped or already complete");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  // ✅ FIX #10: Serve static files for uploaded images (FR-02.9, FR-03.4)
  app.use("/uploads", express.static(uploadsDir));

  // ✅ FIX #7: Add server logging middleware (NFR-LOG-01)
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`,
      );
    });
    next();
  });

  // Middleware to check auth
  const authMiddleware = (req: any, res: any, next: any) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      // ✅ FIX #7: Log auth failures
      console.log(
        `[AUTH] Unauthorized - no token on ${req.method} ${req.path}`,
      );
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      jwt.verify(token, JWT_SECRET);
      next();
    } catch (error) {
      console.log(
        `[AUTH] Invalid token - ${error.message} on ${req.method} ${req.path}`,
      );
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

  app.post("/api/pois", authMiddleware, upload.single("image"), (req, res) => {
    try {
      const { name, type, lat, lng, description, radius } = req.body;

      // ✅ FIX: Validate POI data
      if (!name || !name.trim()) {
        if (req.file) fs.unlinkSync(req.file.path); // Clean up uploaded file if validation fails
        return res.status(400).json({ error: "POI name không được rỗng" });
      }

      if (
        !type ||
        !["Chính", "WC", "Bán vé", "Gửi xe", "Bến thuyền"].includes(type)
      ) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "POI type không hợp lệ" });
      }

      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);

      if (typeof latNum !== "number" || typeof lngNum !== "number") {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Tọa độ phải là số" });
      }

      if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Tọa độ ngoài phạm vi hợp lệ" });
      }

      // ✅ PHASE 1 C3: Validate radius if provided
      const radiusNum = radius ? parseInt(radius) : 0;
      if (!Number.isInteger(radiusNum) || radiusNum < 0) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res
          .status(400)
          .json({ error: "Bán kính phải là số nguyên ≥ 0" });
      }

      // ✅ PHASE 1 C1: Store only filename, not full path
      const imageFilename = req.file ? req.file.filename : null;

      const info = db
        .prepare(
          "INSERT INTO pois (name, type, lat, lng, description, radius, image) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .run(
          name,
          type,
          latNum,
          lngNum,
          description || null,
          radiusNum,
          imageFilename,
        );

      // ✅ v1.4: Fetch created_at, updated_at from database
      const createdPoi = db
        .prepare("SELECT created_at, updated_at FROM pois WHERE id = ?")
        .get(info.lastInsertRowid) as any;

      res.status(201).json({
        id: info.lastInsertRowid,
        created_at: createdPoi?.created_at || null,
        updated_at: createdPoi?.updated_at || null,
      });
    } catch (error) {
      console.error("POST /api/pois error:", error);
      // Clean up file if error occurs
      if ((error as any).type === "MULTER_ERROR" && (req as any).file) {
        try {
          fs.unlinkSync((req as any).file.path);
        } catch (e) {
          console.warn("Failed to cleanup file after error");
        }
      }
      res.status(500).json({ error: "Lỗi tạo POI" });
    }
  });

  app.put(
    "/api/pois/:id",
    authMiddleware,
    upload.single("image"),
    (req, res) => {
      try {
        const { name, type, lat, lng, description, radius, remove_image } =
          req.body;
        const poiId = parseInt(req.params.id);

        // ✅ FIX: Validate POI data
        if (!name || !name.trim()) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "POI name không được rỗng" });
        }

        if (
          !type ||
          !["Chính", "WC", "Bán vé", "Gửi xe", "Bến thuyền"].includes(type)
        ) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "POI type không hợp lệ" });
        }

        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);

        if (typeof latNum !== "number" || typeof lngNum !== "number") {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "Tọa độ phải là số" });
        }

        if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "Tọa độ ngoài phạm vi hợp lệ" });
        }

        // ✅ PHASE 1 C3: Validate radius
        const radiusNum = radius ? parseInt(radius) : 0;
        if (!Number.isInteger(radiusNum) || radiusNum < 0) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res
            .status(400)
            .json({ error: "Bán kính phải là số nguyên ≥ 0" });
        }

        // ✅ PHASE 1 C1: Handle image update/removal
        const oldPoi = db
          .prepare("SELECT image FROM pois WHERE id = ?")
          .get(poiId) as any;

        if (remove_image === "true" && oldPoi?.image) {
          // User clicked remove image button
          try {
            const oldImagePath = path.join(poisDir, oldPoi.image);
            fs.unlinkSync(oldImagePath);
            console.log(`[FS.UNLINK] Removed old POI image: ${oldImagePath}`);
          } catch (e) {
            console.warn(
              `[FS.UNLINK] Warning: Could not delete old image file: ${e}`,
            );
            // Don't block the update - file may have been manually deleted
          }
        } else if (req.file && oldPoi?.image) {
          // New image uploaded, delete old one
          try {
            const oldImagePath = path.join(poisDir, oldPoi.image);
            fs.unlinkSync(oldImagePath);
            console.log(`[FS.UNLINK] Replaced old POI image: ${oldImagePath}`);
          } catch (e) {
            console.warn(
              `[FS.UNLINK] Warning: Could not delete old image file: ${e}`,
            );
            // Don't block the update
          }
        }

        const imageFilename = req.file
          ? req.file.filename
          : remove_image === "true"
            ? null
            : oldPoi?.image;

        db.prepare(
          "UPDATE pois SET name = ?, type = ?, lat = ?, lng = ?, description = ?, radius = ?, image = ? WHERE id = ?",
        ).run(
          name,
          type,
          latNum,
          lngNum,
          description || null,
          radiusNum,
          imageFilename,
          poiId,
        );

        // ✅ v1.4: Fetch updated_at from database
        const updatedPoi = db
          .prepare("SELECT updated_at FROM pois WHERE id = ?")
          .get(poiId) as any;

        res.json({
          success: true,
          updated_at: updatedPoi?.updated_at || null,
        });
      } catch (error) {
        console.error("PUT /api/pois/:id error:", error);
        // Clean up uploaded file if error
        if ((req as any).file) {
          try {
            fs.unlinkSync((req as any).file.path);
          } catch (e) {
            console.warn("Failed to cleanup file after error");
          }
        }
        res.status(500).json({ error: "Lỗi cập nhật POI" });
      }
    },
  );

  app.delete("/api/pois/:id", authMiddleware, (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id) {
        return res.status(400).json({ error: "POI ID không hợp lệ" });
      }

      // ✅ PHASE 1 C1: Get POI record to unlink image file before deleting
      const poi = db
        .prepare("SELECT image FROM pois WHERE id = ?")
        .get(id) as any;

      if (poi?.image) {
        try {
          const imagePath = path.join(poisDir, poi.image);
          fs.unlinkSync(imagePath);
          console.log(`[FS.UNLINK] Deleted POI image: ${imagePath}`);
        } catch (e) {
          console.warn(
            `[FS.UNLINK] Warning: Could not delete POI image file: ${e}. Will proceed with DB deletion.`,
          );
          // Don't block deletion - file may have been manually deleted
        }
      }

      // ✅ v1.4: Use tour_pois table to check if POI is used in tours
      // Prevent deletion if POI is in any tour
      const tourWithPoi = db
        .prepare(
          "SELECT DISTINCT t.id, t.title FROM tour_pois tp JOIN tours t ON tp.tour_id = t.id WHERE tp.poi_id = ?",
        )
        .all(id) as Array<{ id: number; title: string }>;

      if (tourWithPoi.length > 0) {
        return res.status(409).json({
          error: `POI đang được dùng trong ${tourWithPoi.length} tour: ${tourWithPoi.map((t: any) => t.title).join(", ")}`,
        });
      }

      // Delete the POI
      db.prepare("DELETE FROM pois WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (error) {
      console.error("DELETE /api/pois/:id error:", error);
      res.status(500).json({ error: "Lỗi xóa POI" });
    }
  });

  // Tours
  // ✅ PHASE 2 C14: GET /api/tours with LEFT JOIN to get POI details from tour_pois
  app.get("/api/tours", authMiddleware, (req, res) => {
    try {
      const tours = db.prepare("SELECT * FROM tours").all() as Array<any>;

      const formattedTours = tours.map((t: any) => {
        // ✅ v1.4: LEFT JOIN to fetch POI details ordered by position
        const poisData = db
          .prepare(
            `SELECT 
              tp.poi_id,
              tp.position,
              p.name,
              p.type,
              p.lat,
              p.lng,
              p.description,
              p.radius
            FROM tour_pois tp
            LEFT JOIN pois p ON tp.poi_id = p.id
            WHERE tp.tour_id = ?
            ORDER BY tp.position ASC`,
          )
          .all(t.id) as Array<any>;

        // ✅ v1.4: Build both pois array (detailed) and poi_ids array (just IDs) for frontend compatibility
        const pois = poisData.map((p: any) => ({
          poi_id: p.poi_id,
          position: p.position,
          name: p.name || "Unknown",
          type: p.type || "Unknown",
          lat: p.lat,
          lng: p.lng,
          description: p.description || null,
          radius: p.radius || 0,
        }));

        const poi_ids = pois.map((p: any) => p.poi_id);

        return {
          id: t.id,
          title: t.title,
          description: t.description || null,
          image: t.image || null,
          image_url: t.image
            ? `http://localhost:3000/uploads/tours/${t.image}`
            : null,
          created_at: t.created_at || null,
          updated_at: t.updated_at || null,
          poi_ids: poi_ids,
          pois: pois,
        };
      });
      res.json(formattedTours);
    } catch (error) {
      console.error("GET /api/tours error:", error);
      res.status(500).json({ error: "Lỗi tải Tour" });
    }
  });

  app.post("/api/tours", authMiddleware, upload.single("image"), (req, res) => {
    try {
      const { title, description, poi_ids: poi_ids_str } = req.body;

      let poi_ids: number[] = [];
      try {
        poi_ids = JSON.parse(poi_ids_str || "[]");
      } catch {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Invalid poi_ids format" });
      }

      // ✅ FIX: Validate input trước khi insert
      if (!title || !title.trim()) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Tour title không được rỗng" });
      }

      if (!Array.isArray(poi_ids) || poi_ids.length === 0) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: "Tour phải chứa ít nhất 1 POI" });
      }

      // ✅ FIX #4: Validate all POI IDs exist in database (NFR-VAL-05)
      const allPois = db.prepare("SELECT id FROM pois").all() as Array<{
        id: number;
      }>;
      const validPoiIds = new Set(allPois.map((p: any) => p.id));
      const invalidIds = poi_ids.filter((id: number) => !validPoiIds.has(id));
      if (invalidIds.length > 0) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({
          error: `POI IDs không tồn tại: ${invalidIds.join(", ")}`,
        });
      }

      // ✅ PHASE 1 C6: Store only filename
      const imageFilename = req.file ? req.file.filename : null;

      // ✅ v1.4: Use SQLite Transaction for data integrity
      // Insert into tours table WITHOUT poi_ids column
      const insertTourStmt = db.prepare(
        "INSERT INTO tours (title, description, image, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      );

      const insertTourPoisStmt = db.prepare(
        "INSERT INTO tour_pois (tour_id, poi_id, position) VALUES (?, ?, ?)",
      );

      // ⚠️ Start transaction
      const transaction = db.transaction(() => {
        const tourInfo = insertTourStmt.run(
          title,
          description || null,
          imageFilename,
        );

        const tour_id = tourInfo.lastInsertRowid as number;

        // ✅ v1.4: Insert into tour_pois with position = order in array
        poi_ids.forEach((poi_id: number, index: number) => {
          insertTourPoisStmt.run(tour_id, poi_id, index + 1);
        });

        return tour_id;
      });

      const tourId = transaction();

      // ✅ v1.4: Fetch created_at, updated_at from database (SQLite auto-assigned)
      const createdTour = db
        .prepare("SELECT created_at, updated_at FROM tours WHERE id = ?")
        .get(tourId) as any;

      // ✅ v1.4: Fetch poi_ids from tour_pois table to return in response
      const tourPois = db
        .prepare(
          "SELECT poi_id FROM tour_pois WHERE tour_id = ? ORDER BY position ASC",
        )
        .all(tourId) as Array<{ poi_id: number }>;

      res.status(201).json({
        id: tourId,
        created_at: createdTour?.created_at || null,
        updated_at: createdTour?.updated_at || null,
        poi_ids: tourPois.map((tp) => tp.poi_id),
      });
    } catch (error) {
      console.error("POST /api/tours error:", error);
      if ((req as any).file) {
        try {
          fs.unlinkSync((req as any).file.path);
        } catch (e) {
          console.warn("Failed to cleanup file after error");
        }
      }
      res.status(500).json({ error: "Lỗi tạo tour" });
    }
  });

  app.put(
    "/api/tours/:id",
    authMiddleware,
    upload.single("image"),
    (req, res) => {
      try {
        const {
          title,
          description,
          poi_ids: poi_ids_str,
          remove_image,
        } = req.body;
        const tourId = parseInt(req.params.id);

        let poi_ids: number[] = [];
        try {
          poi_ids = JSON.parse(poi_ids_str || "[]");
        } catch {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "Invalid poi_ids format" });
        }

        // ✅ FIX: Validate input
        if (!title || !title.trim()) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({ error: "Tour title không được rỗng" });
        }

        if (!Array.isArray(poi_ids) || poi_ids.length === 0) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res
            .status(400)
            .json({ error: "Tour phải chứa ít nhất 1 POI" });
        }

        // ✅ FIX #4: Validate all POI IDs exist in database (NFR-VAL-05)
        const allPois = db.prepare("SELECT id FROM pois").all() as Array<{
          id: number;
        }>;
        const validPoiIds = new Set(allPois.map((p: any) => p.id));
        const invalidIds = poi_ids.filter((id: number) => !validPoiIds.has(id));
        if (invalidIds.length > 0) {
          if (req.file) fs.unlinkSync(req.file.path);
          return res.status(400).json({
            error: `POI IDs không tồn tại: ${invalidIds.join(", ")}`,
          });
        }

        // ✅ PHASE 1 C6: Handle image update/removal for tours
        const oldTour = db
          .prepare("SELECT image FROM tours WHERE id = ?")
          .get(tourId) as any;

        if (remove_image === "true" && oldTour?.image) {
          // User clicked remove image button
          try {
            const oldImagePath = path.join(toursDir, oldTour.image);
            fs.unlinkSync(oldImagePath);
            console.log(`[FS.UNLINK] Removed tour image: ${oldImagePath}`);
          } catch (e) {
            console.warn(
              `[FS.UNLINK] Warning: Could not delete tour image: ${e}`,
            );
          }
        } else if (req.file && oldTour?.image) {
          // New image uploaded, delete old one
          try {
            const oldImagePath = path.join(toursDir, oldTour.image);
            fs.unlinkSync(oldImagePath);
            console.log(`[FS.UNLINK] Replaced tour image: ${oldImagePath}`);
          } catch (e) {
            console.warn(
              `[FS.UNLINK] Warning: Could not delete old tour image: ${e}`,
            );
          }
        }

        const imageFilename = req.file
          ? req.file.filename
          : remove_image === "true"
            ? null
            : oldTour?.image;

        // ✅ v1.4: Use SQLite Transaction for data integrity
        const updateTourStmt = db.prepare(
          "UPDATE tours SET title = ?, description = ?, image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        );

        const deleteTourPoisStmt = db.prepare(
          "DELETE FROM tour_pois WHERE tour_id = ?",
        );

        const insertTourPoisStmt = db.prepare(
          "INSERT INTO tour_pois (tour_id, poi_id, position) VALUES (?, ?, ?)",
        );

        // ⚠️ Start transaction
        const transaction = db.transaction(() => {
          // ✅ v1.4: Update tours WITHOUT poi_ids column
          updateTourStmt.run(title, description || null, imageFilename, tourId);

          // ✅ v1.4: Delete old tour_pois records
          deleteTourPoisStmt.run(tourId);

          // ✅ v1.4: Insert new tour_pois with updated positions
          poi_ids.forEach((poi_id: number, index: number) => {
            insertTourPoisStmt.run(tourId, poi_id, index + 1);
          });
        });

        transaction();

        // ✅ v1.4: Fetch updated_at from database (SQLite auto-updated)
        const updatedTour = db
          .prepare("SELECT updated_at FROM tours WHERE id = ?")
          .get(tourId) as any;

        // ✅ v1.4: Fetch poi_ids from tour_pois table to return in response
        const tourPois = db
          .prepare(
            "SELECT poi_id FROM tour_pois WHERE tour_id = ? ORDER BY position ASC",
          )
          .all(tourId) as Array<{ poi_id: number }>;

        res.json({
          success: true,
          updated_at: updatedTour?.updated_at || null,
          poi_ids: tourPois.map((tp) => tp.poi_id),
        });
      } catch (error) {
        console.error("PUT /api/tours/:id error:", error);
        if ((req as any).file) {
          try {
            fs.unlinkSync((req as any).file.path);
          } catch (e) {
            console.warn("Failed to cleanup file after error");
          }
        }
        res.status(500).json({ error: "Lỗi cập nhật tour" });
      }
    },
  );

  app.delete("/api/tours/:id", authMiddleware, (req, res) => {
    try {
      const tourId = parseInt(req.params.id);
      if (!tourId) {
        return res.status(400).json({ error: "Tour ID không hợp lệ" });
      }

      // ✅ PHASE 1 C6: Get tour record to unlink image file before deleting
      const tour = db
        .prepare("SELECT image FROM tours WHERE id = ?")
        .get(tourId) as any;

      if (tour?.image) {
        try {
          const imagePath = path.join(toursDir, tour.image);
          fs.unlinkSync(imagePath);
          console.log(`[FS.UNLINK] Deleted tour image: ${imagePath}`);
        } catch (e) {
          console.warn(
            `[FS.UNLINK] Warning: Could not delete tour image file: ${e}. Will proceed with DB deletion.`,
          );
        }
      }

      db.prepare("DELETE FROM tours WHERE id = ?").run(tourId);
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
