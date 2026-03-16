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
