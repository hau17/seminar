import { POI, Tour } from "../types";

export const validatePOI = (poi: Partial<POI>): string | null => {
  if (!poi.name?.trim()) return "Tên POI là bắt buộc";
  if (poi.name.length > 255) return "Tên POI không vượt quá 255 ký tự";
  if (!poi.description?.trim()) return "Mô tả là bắt buộc";

  if (poi.lat === undefined || poi.lat === null || poi.lat < -90 || poi.lat > 90)
    return "Vĩ độ phải trong khoảng [-90, 90]";
  if (poi.lng === undefined || poi.lng === null || poi.lng < -180 || poi.lng > 180)
    return "Kinh độ phải trong khoảng [-180, 180]";

  if (poi.range_m !== undefined && (poi.range_m < 1 || !Number.isInteger(poi.range_m)))
    return "Phạm vi phải là số nguyên ≥ 1";

  return null;
};

export const validateTour = (tour: Partial<Tour>): string | null => {
  if (!tour.name?.trim()) return "Tên Tour là bắt buộc";
  if (tour.name.length > 255) return "Tên Tour không vượt quá 255 ký tự";
  if (!tour.poi_ids || tour.poi_ids.length === 0)
    return "Tour phải chứa ít nhất 1 POI";
  return null;
};
