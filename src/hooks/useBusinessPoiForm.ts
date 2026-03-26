import { useState } from "react";
import { POIImage } from "../types";

export interface BusinessPOI {
  id: number;
  name: string;
  description: string;
  lat: number;
  lng: number;
  range_m: number;
  owner_type: 'admin' | 'business';
  owner_id?: number | null;
  images?: POIImage[];
}

export function useBusinessPoiForm(poi: BusinessPOI | undefined, token: string, onSaved: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: poi?.name || "",
    description: poi?.description || "",
    lat: poi?.lat ?? ("" as number | string),
    lng: poi?.lng ?? ("" as number | string),
    range_m: poi?.range_m ?? 1,
  });

  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);

  const existingImages = (poi?.images || []).filter((img) => !deleteIds.includes(img.id));
  const totalCount = existingImages.length + newFiles.length;

  const handleFileChange = (files: File[]) => {
    const allowed = 5 - totalCount;
    const valid = files.filter(
      (f) => f.size <= 5 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(f.type)
    );
    setNewFiles((p) => [...p, ...valid.slice(0, allowed)]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) { setError("Tên POI không được rỗng"); return; }
    if (!form.description.trim()) { setError("Mô tả không được rỗng"); return; }

    const lat = parseFloat(form.lat as any);
    const lng = parseFloat(form.lng as any);
    if (isNaN(lat) || lat < -90 || lat > 90) { setError("Vĩ độ không hợp lệ [-90, 90]"); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { setError("Kinh độ không hợp lệ [-180, 180]"); return; }

    const formData = new FormData();
    formData.append("name", form.name.trim());
    formData.append("description", form.description.trim());
    formData.append("lat", lat.toString());
    formData.append("lng", lng.toString());
    formData.append("range_m", form.range_m.toString());

    if (poi) {
      deleteIds.forEach((id) => formData.append("delete_image_ids", String(id)));
      newFiles.forEach((f) => formData.append("new_images", f));
    } else {
      newFiles.forEach((f) => formData.append("images", f));
    }

    const url = poi ? `/api/business/pois/${poi.id}` : "/api/business/pois";
    const method = poi ? "PUT" : "POST";

    setLoading(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Lỗi lưu POI");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu POI");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!poi) return;
    if (!confirm(`Xóa POI "${poi.name}"?`)) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/business/pois/${poi.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (res.status === 409) {
        setError(`Không thể xóa: đang trong Tour: ${d.tours?.map((t: any) => t.name).join(", ")}`);
        return;
      }
      if (!res.ok) { setError(d.error || "Lỗi xóa POI"); return; }
      onSaved();
    } catch {
      setError("Lỗi xóa POI");
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    setForm,
    newFiles,
    setNewFiles,
    deleteIds,
    setDeleteIds,
    existingImages,
    totalCount,
    loading,
    error,
    handleFileChange,
    handleSubmit,
    handleDelete
  };
}
