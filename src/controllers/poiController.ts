import { Request, Response } from "express";
import getDb from "../db";

/**
 * Create Business POI
 * POST /api/business/pois
 */
export const createBusinessPOI = async (req: Request, res: Response) => {
  try {
    const businessId = req.business_id;
    if (!businessId) return res.status(401).json({ error: "Unauthorized" });

    const { name, description, lat, lng, range_m } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: "Tên POI không được rỗng" });
    if (!description?.trim()) return res.status(400).json({ error: "Mô tả không được rỗng" });

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || latNum < -90 || latNum > 90)
      return res.status(400).json({ error: "Vĩ độ không hợp lệ" });
    if (isNaN(lngNum) || lngNum < -180 || lngNum > 180)
      return res.status(400).json({ error: "Kinh độ không hợp lệ" });

    const db = getDb();
    const info = db
      .prepare(
        "INSERT INTO pois (name, description, lat, lng, range_m, owner_type, owner_id) VALUES (?, ?, ?, ?, ?, 'business', ?)"
      )
      .run(name.trim(), description.trim(), latNum, lngNum, parseInt(range_m) || 0, businessId);

    const poiId = info.lastInsertRowid as number;

    // Handle image uploads (multer)
    const files = (req.files as Express.Multer.File[]) || [];
    files.forEach((f, idx) => {
      db.prepare("INSERT INTO poi_images (poi_id, file_path, sort_order) VALUES (?, ?, ?)").run(
        poiId, `/uploads/pois/${f.filename}`, idx
      );
    });

    const created = db.prepare("SELECT * FROM pois WHERE id = ?").get(poiId) as any;
    const images  = db.prepare("SELECT * FROM poi_images WHERE poi_id = ?").all(poiId) as any[];
    res.status(201).json({ ...created, images, audio_files: [], translations: [] });
  } catch (err) {
    console.error("createBusinessPOI:", err);
    res.status(500).json({ error: "Lỗi tạo POI" });
  }
};

/**
 * Get Business POIs
 * GET /api/business/pois
 */
export const getBusinessPOIs = (req: Request, res: Response) => {
  try {
    const businessId = req.business_id;
    if (!businessId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const rows = db
      .prepare(
        "SELECT * FROM pois WHERE owner_type='business' AND owner_id=? ORDER BY created_at DESC"
      )
      .all(businessId) as any[];

    if (!rows.length) return res.json([]);

    const ids = rows.map((p) => p.id).join(",");
    const images = db.prepare(`SELECT * FROM poi_images WHERE poi_id IN (${ids})`).all() as any[];
    const result = rows.map((p) => ({
      ...p,
      images: images.filter((i) => i.poi_id === p.id),
      audio_files: [],
      translations: [],
    }));
    res.json(result);
  } catch (err) {
    console.error("getBusinessPOIs:", err);
    res.status(500).json({ error: "Lỗi tải POI" });
  }
};

/**
 * Get Single Business POI
 * GET /api/business/pois/:poi_id
 */
export const getBusinessPOI = (req: Request, res: Response) => {
  try {
    const businessId = req.business_id;
    const { poi_id } = req.params;
    if (!businessId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const poi = db
      .prepare("SELECT * FROM pois WHERE id=? AND owner_type='business' AND owner_id=?")
      .get(poi_id, businessId);

    if (!poi) return res.status(404).json({ error: "POI không tồn tại" });
    res.json(poi);
  } catch (err) {
    console.error("getBusinessPOI:", err);
    res.status(500).json({ error: "Lỗi tải POI" });
  }
};

/**
 * Delete Business POI
 * DELETE /api/business/pois/:poi_id
 */
export const deleteBusinessPOI = (req: Request, res: Response) => {
  try {
    const businessId = req.business_id;
    const { poi_id } = req.params;
    if (!businessId) return res.status(401).json({ error: "Unauthorized" });

    const db = getDb();
    const poi = db
      .prepare("SELECT * FROM pois WHERE id=? AND owner_type='business' AND owner_id=?")
      .get(poi_id, businessId) as any;

    if (!poi) return res.status(404).json({ error: "POI không tồn tại" });

    const tours = db
      .prepare(
        `SELECT t.id, t.name FROM tour_pois tp JOIN tours t ON t.id=tp.tour_id WHERE tp.poi_id=?`
      )
      .all(poi_id) as any[];

    if (tours.length > 0)
      return res.status(409).json({ error: "POI đang nằm trong tour, không thể xóa", tours });

    db.prepare("DELETE FROM pois WHERE id=?").run(poi_id);
    res.json({ success: true });
  } catch (err) {
    console.error("deleteBusinessPOI:", err);
    res.status(500).json({ error: "Lỗi xóa POI" });
  }
};
