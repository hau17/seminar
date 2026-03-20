import { Request, Response } from "express";
import getDb from "../db";
import { POIStatus } from "../types";

/**
 * ✅ v1.7: Create POI by Business
 * POST /api/businesses/pois
 * Middleware: verifyBusinessToken
 * Body: { name, type, description, lat, lng, radius, image }
 * Returns: { poi_id, status, owner_id, created_at }
 *
 * ✅ RULE: POI is ALWAYS created with status='Pending' (PR1.7 C3)
 * ✅ RULE: Coordinates must be within Khu phố ẩm thực Vĩnh Khánh (10.7570, 106.7000) ±0.02
 */
export const createBusinessPOI = (req: Request, res: Response) => {
  try {
    const businessId = req.businessId;

    if (!businessId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: businessId missing" });
    }

    const { name, type, description, lat, lng, radius, image } = req.body;

    // ✅ Validation
    if (!name || !type) {
      return res.status(400).json({ error: "name and type are required" });
    }

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ error: "lat and lng must be numbers" });
    }

    // ✅ v1.7 RULE: Coordinates must be within Khu phố ẩm thực Vĩnh Khánh
    // Default center: (10.7570, 106.7000) ±0.02 (approx 2.2km radius)
    const DEFAULT_LAT = 10.757;
    const DEFAULT_LNG = 106.7;
    const MAX_DISTANCE = 0.02; // ~2.2km in degrees

    const latDistance = Math.abs(lat - DEFAULT_LAT);
    const lngDistance = Math.abs(lng - DEFAULT_LNG);

    if (latDistance > MAX_DISTANCE || lngDistance > MAX_DISTANCE) {
      return res.status(400).json({
        error: `Coordinates must be within Khu phố ẩm thực Vĩnh Khánh (lat: ${DEFAULT_LAT}±${MAX_DISTANCE}, lng: ${DEFAULT_LNG}±${MAX_DISTANCE})`,
      });
    }

    const db = getDb();

    // ✅ v1.7 RULE: Status is ALWAYS 'Pending' (C3)
    const result = db
      .prepare(
        `INSERT INTO pois (name, type, description, lat, lng, radius, image, status, owner_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .run(
        name,
        type,
        description || null,
        lat,
        lng,
        radius || 0,
        image || null,
        POIStatus.PENDING, // ✅ Always Pending
        businessId,
      );

    const poiId = result.lastInsertRowid as number;

    res.status(201).json({
      success: true,
      poi_id: poiId,
      status: POIStatus.PENDING,
      owner_id: businessId,
      message: "POI created successfully (awaiting approval)",
    });
  } catch (error) {
    console.error("Create POI error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * ✅ v1.7: Get Business POIs (grouped by status)
 * GET /api/businesses/pois
 * Middleware: verifyBusinessToken
 * Returns: { pending: [...], approved: [...], rejected: [...] }
 */
export const getBusinessPOIs = (req: Request, res: Response) => {
  try {
    const businessId = req.businessId;

    if (!businessId) {
      return res
        .status(401)
        .json({ error: "Unauthorized: businessId missing" });
    }

    const db = getDb();

    // ✅ Get all POIs for this business, grouped by status
    const pois = db
      .prepare(
        `SELECT id, name, type, description, lat, lng, radius, image, status, reject_reason, created_at, updated_at
         FROM pois
         WHERE owner_id = ?
         ORDER BY created_at DESC`,
      )
      .all(businessId) as any[];

    // ✅ Group by status
    const grouped = {
      pending: pois.filter((p) => p.status === POIStatus.PENDING),
      approved: pois.filter((p) => p.status === POIStatus.APPROVED),
      rejected: pois.filter((p) => p.status === POIStatus.REJECTED),
    };

    res.status(200).json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    console.error("Get POIs error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * ✅ v1.7: Get Single POI Details
 * GET /api/businesses/pois/:poi_id
 * Middleware: verifyBusinessToken
 * Returns: POI object
 */
export const getBusinessPOI = (req: Request, res: Response) => {
  try {
    const businessId = req.businessId;
    const { poi_id } = req.params;

    if (!businessId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = getDb();

    const poi = db
      .prepare(`SELECT * FROM pois WHERE id = ? AND owner_id = ?`)
      .get(poi_id, businessId);

    if (!poi) {
      return res.status(404).json({ error: "POI not found" });
    }

    res.status(200).json({
      success: true,
      data: poi,
    });
  } catch (error) {
    console.error("Get POI error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * ✅ v1.7: Delete POI (creates DeleteRequest)
 * DELETE /api/businesses/pois/:poi_id
 * Middleware: verifyBusinessToken
 * Returns: { success: true, message: "Delete request created" }
 */
export const deleteBusinessPOI = (req: Request, res: Response) => {
  try {
    const businessId = req.businessId;
    const { poi_id } = req.params;

    if (!businessId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const db = getDb();

    // ✅ Check if POI exists and belongs to this business
    const poi = db
      .prepare(`SELECT * FROM pois WHERE id = ? AND owner_id = ?`)
      .get(poi_id, businessId) as any;

    if (!poi) {
      return res.status(404).json({ error: "POI not found" });
    }

    // ✅ Check if POI is in any Tour (cannot delete if in Tour)
    const tourCount = db
      .prepare("SELECT COUNT(*) as count FROM tour_pois WHERE poi_id = ?")
      .get(poi_id) as any;

    if (tourCount.count > 0) {
      return res.status(400).json({
        error: "Cannot delete POI that is part of an active Tour",
      });
    }

    // ✅ For now: Direct delete (later will be DeleteRequest)
    // ✅ TODO v1.7: Implement DeleteRequest table and workflow
    db.prepare("DELETE FROM pois WHERE id = ? AND owner_id = ?").run(
      poi_id,
      businessId,
    );

    res.status(200).json({
      success: true,
      message: "POI deleted successfully",
    });
  } catch (error) {
    console.error("Delete POI error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
