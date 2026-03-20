export enum POIType {
  MAIN = "Chính",
  WC = "WC",
  TICKET = "Bán vé",
  PARKING = "Gửi xe",
  PORT = "Bến thuyền",
}

export interface POI {
  id?: number;
  name: string;
  type: POIType;
  lat: number;
  lng: number;
  description?: string;
  radius?: number; // ✅ PHASE 1 C3: Bán kính (mét)
  image?: string; // ✅ PHASE 1 C1: Filename only (not full URL) - changed from image_url
}

export interface Tour {
  id?: number;
  title: string;
  description?: string; // ✅ PHASE 2 C7: Mô tả lộ trình (optional, max 1000 ký tự)
  poi_ids: number[]; // ✅ Array of POI IDs in order (from tour_pois table)
  pois?: Array<{
    // ✅ v1.4: Detailed POI information for form pre-population and map rendering
    poi_id: number;
    position: number;
    name: string;
    type: POIType;
    lat: number;
    lng: number;
    description?: string;
    radius?: number;
  }>;
  image?: string; // ✅ PHASE 1 C6: Filename only (not full URL) - changed from image_url
}

// ✅ v1.5 BUSINESS TYPES
// ✅ v1.6: Removed DRAFT status - businesses create Pending, admin creates Approved
export enum POIStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected",
}

export interface BusinessUser {
  id: number;
  company_name: string;
  email: string;
  phone?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BusinessPOI extends POI {
  id: number;
  status: POIStatus;
  owner_id: number;
  reject_reason?: string;
  image_url?: string; // ✅ Full URL for display (different from POI.image)
  created_at: string;
  updated_at: string;
}

export interface BusinessAuthState {
  business: BusinessUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ✅ v1.7 BUSINESS AUTH RESPONSE
export interface BusinessAuthResponse {
  success: boolean;
  business_id: number;
  business_token: string;
  company_name: string;
  email: string;
  message: string;
}

// ✅ v1.7 POI WITH STATUS & OWNER
export interface POIWithStatus extends POI {
  id: number;
  status: POIStatus;
  owner_id: number;
  reject_reason?: string;
  created_at: string;
  updated_at: string;
}

// ✅ v1.7 EDIT/DELETE REQUESTS
export interface EditRequest {
  id: number;
  poi_id: number;
  business_id: number;
  new_data: Record<string, any>;
  state: "PENDING" | "APPROVED" | "REJECTED";
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface DeleteRequest {
  id: number;
  poi_id: number;
  business_id: number;
  state: "PENDING" | "APPROVED" | "REJECTED";
  rejected_reason?: string;
  created_at: string;
  updated_at: string;
}
