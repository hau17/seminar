import { useState, useCallback } from "react";
import { POI } from "../types";

export const usePOIs = (token: string | null) => {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(false);

  const authHeaders = (): HeadersInit =>
    token ? { Authorization: `Bearer ${token}` } : {};

  const fetchPois = useCallback(
    async (search?: string) => {
      setLoading(true);
      try {
        const url = search
          ? `/api/admin/pois?search=${encodeURIComponent(search)}`
          : "/api/admin/pois";
        const res = await fetch(url, { headers: authHeaders() });
        if (res.status === 401) {
          localStorage.removeItem("adminToken");
          window.location.href = "/";
          throw new Error("Session hết hạn");
        }
        if (!res.ok) throw new Error("Lỗi tải POIs");
        const data = await res.json();
        setPois(data);
      } catch (err) {
        console.error(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [token] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /**
   * savePoi — create or update a POI.
   * @param poi  Partial POI (id present → PUT, absent → POST)
   * @param newImageFiles  New image files to upload (≤5 total)
   * @param deleteImageIds IDs of poi_images to delete on PUT
   */
  const savePoi = useCallback(
    async (
      poi: Partial<POI>,
      newImageFiles?: File[],
      deleteImageIds?: number[]
    ) => {
      const isEdit = !!poi.id;
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/admin/pois/${poi.id}` : "/api/admin/pois";

      const formData = new FormData();
      formData.append("name", poi.name || "");
      formData.append("description", poi.description || "");
      formData.append("lat", (poi.lat ?? 0).toString());
      formData.append("lng", (poi.lng ?? 0).toString());
      formData.append("range_m", (poi.range_m ?? 0).toString());

      if (isEdit && deleteImageIds?.length) {
        deleteImageIds.forEach((id) =>
          formData.append("delete_image_ids", String(id))
        );
      }

      const imageField = isEdit ? "new_images" : "images";
      (newImageFiles || []).forEach((f) => formData.append(imageField, f));

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi lưu POI");
      }

      try {
        await fetchPois();
      } catch (e) {
        console.warn("Không thể reload danh sách POI:", e);
      }
    },
    [token, fetchPois] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const deletePoi = useCallback(
    async (id: number): Promise<{ tours?: { id: number; name: string }[] }> => {
      const res = await fetch(`/api/admin/pois/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      const data = await res.json();

      if (res.status === 409) {
        // POI is in a tour — return tour list so caller can show message
        return { tours: data.tours };
      }
      if (!res.ok) throw new Error(data.error || "Lỗi xóa POI");

      try {
        await fetchPois();
      } catch (e) {
        console.warn("Không thể reload danh sách POI:", e);
      }
      return {};
    },
    [token, fetchPois] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const deleteBusinessPoi = useCallback(
    async (
      poiId: number
    ): Promise<{ tours?: { id: number; name: string }[] }> => {
      const res = await fetch(`/api/admin/pois/business/${poiId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.status === 409) return { tours: data.tours };
      if (!res.ok) throw new Error(data.error || "Lỗi xóa POI doanh nghiệp");
      try {
        await fetchPois();
      } catch (e) {
        console.warn("Không thể reload danh sách POI:", e);
      }
      return {};
    },
    [token, fetchPois] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { pois, setPois, loading, fetchPois, savePoi, deletePoi, deleteBusinessPoi };
};
