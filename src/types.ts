export enum POIType {
  MAIN = "Chính",
  WC = "WC",
  TICKET = "Bán vé",
  PARKING = "Gửi xe",
  PORT = "Bến thuyền"
}

export interface POI {
  id?: number;
  name: string;
  type: POIType;
  lat: number;
  lng: number;
  description?: string;
}

export interface Tour {
  id?: number;
  title: string;
  poi_ids: number[];
}
