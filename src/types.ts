// ─── POI ─────────────────────────────────────────────────────────────────────

export interface POIImage {
  id: number;
  poi_id: number;
  file_path: string;
  sort_order: number;
}

export interface POIAudioFile {
  id: number;
  poi_id: number;
  language_code: string;
  version: number;
  file_path: string;
}

export interface POITranslation {
  id: number;
  poi_id: number;
  language_code: string;
  translated_name: string;
  translated_description: string;
}

export interface POI {
  id?: number;
  name: string;
  description: string;
  lat: number;
  lng: number;
  range_m: number;          // bán kính tính metre
  owner_type: "admin" | "business";
  owner_id: number;
  created_at?: string;
  updated_at?: string;
  images?: POIImage[];
  audio_files?: POIAudioFile[];
  translations?: POITranslation[];
}

// ─── TOUR ────────────────────────────────────────────────────────────────────

export interface TourImage {
  id: number;
  tour_id: number;
  file_path: string;
  sort_order: number;
}

export interface TourPOI {
  tour_id: number;
  poi_id: number;
  position: number;
  name: string;
  lat: number;
  lng: number;
}

export interface Tour {
  id?: number;
  name: string;
  description?: string;
  created_by_type: "admin" | "user";
  created_by_id: number;
  created_at?: string;
  updated_at?: string;
  images?: TourImage[];
  pois?: TourPOI[];
  poi_ids?: number[];         // flattened for convenience
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  name: string;
  email: string;
}

export interface BusinessUser {
  id: number;
  name: string;
  email: string;
  created_at?: string;
  poi_count?: number;
}

export interface BusinessAuthState {
  business: BusinessUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ─── DASHBOARD STATS ──────────────────────────────────────────────────────────

export interface DashboardStats {
  total_users: number;
  total_businesses: number;
  total_pois: number;
  pois_by_admin: number;
  pois_by_business: number;
  total_tours: number;
  tours_by_admin: number;
  tours_by_user: number;
}
