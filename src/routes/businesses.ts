import express from "express";
import {
  registerBusiness,
  loginBusiness,
  getBusinessProfile,
} from "../controllers/businessController";
import {
  createBusinessPOI,
  getBusinessPOIs,
  getBusinessPOI,
  deleteBusinessPOI,
} from "../controllers/poiController";
import { verifyBusinessToken } from "../middleware/auth";

const router = express.Router();

/**
 * ✅ v1.7: Business Authentication Routes
 */
router.post("/register", registerBusiness);
router.post("/login", loginBusiness);

/**
 * ✅ v1.7: Protected Routes (require business_token)
 */

// Business Profile
router.get("/me", verifyBusinessToken, getBusinessProfile);

// POI Management
router.post("/pois", verifyBusinessToken, createBusinessPOI);
router.get("/pois", verifyBusinessToken, getBusinessPOIs);
router.get("/pois/:poi_id", verifyBusinessToken, getBusinessPOI);
router.delete("/pois/:poi_id", verifyBusinessToken, deleteBusinessPOI);

export default router;
