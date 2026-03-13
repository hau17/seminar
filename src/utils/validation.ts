import { POI, POIType, Tour } from "../types";

export const validatePOI = (poi: Partial<POI>): string | null => {
  if (!poi.name || poi.name.trim() === "") {
    return "Tên điểm là bắt buộc";
  }
  if (poi.name.length > 255) {
    return "Tên điểm không vượt quá 255 ký tự";
  }
  // ✅ FIX #3: Validate POI type is valid enum (NFR-VAL-02)
  if (!poi.type || !Object.values(POIType).includes(poi.type)) {
    return "Loại điểm không hợp lệ";
  }
  if (!poi.lat || poi.lat < -90 || poi.lat > 90) {
    return "Vĩ độ phải trong khoảng [-90, 90]";
  }
  if (!poi.lng || poi.lng < -180 || poi.lng > 180) {
    return "Kinh độ phải trong khoảng [-180, 180]";
  }
  return null;
};

export const validateTour = (tour: Partial<Tour>): string | null => {
  if (!tour.title || tour.title.trim() === "") {
    return "Tên tour là bắt buộc";
  }
  if (tour.title.length > 255) {
    return "Tên tour không vượt quá 255 ký tự";
  }
  if (!tour.poi_ids || tour.poi_ids.length === 0) {
    return "Tour phải chứa ít nhất 1 POI";
  }
  return null;
};
