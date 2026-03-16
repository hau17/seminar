import { useState, useCallback } from "react";
import { POI } from "../types";

export const usePOIs = (token: string | null) => {
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPois = useCallback(async () => {
    setLoading(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/pois", { headers });
      if (res.status === 401) {
        localStorage.removeItem("authToken");
        window.location.href = "/"; // Redirect to login
        throw new Error("Session hết hạn");
      }

      if (!res.ok) throw new Error("Lỗi tải POIs");

      // if (!res.ok) throw new Error("Lỗi tải POIs");
      const data = await res.json();
      setPois(data);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const savePoi = useCallback(
    async (
      poi: Partial<POI>,
      imageFile?: File | null,
      removeImage?: boolean,
    ) => {
      const method = poi.id ? "PUT" : "POST";
      const url = poi.id ? `/api/pois/${poi.id}` : "/api/pois";

      // ✅ PHASE 1 C1, C3: Use FormData for multipart/form-data
      const formData = new FormData();
      formData.append("name", poi.name || "");
      formData.append("type", poi.type || "");
      formData.append("lat", (poi.lat || 0).toString());
      formData.append("lng", (poi.lng || 0).toString());
      formData.append("description", poi.description || "");
      formData.append("radius", (poi.radius || 0).toString());

      if (imageFile) {
        formData.append("image", imageFile);
      }
      if (removeImage) {
        formData.append("remove_image", "true");
      }

      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      // ✅ IMPORTANT: Do NOT set Content-Type - browser will set it with boundary

      const res = await fetch(url, {
        method,
        headers,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Lỗi lưu POI");
      }

      // ✅ FIX: Refresh POI list, nhưng không throw error nếu fetchPois fail
      try {
        await fetchPois();
      } catch (error) {
        console.warn(
          "Cảnh báo: Không thể tải lại danh sách POI, vui lòng refresh",
          error,
        );
      }
    },
    [token, fetchPois],
  );

  const deletePoi = useCallback(
    async (id: number) => {
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/pois/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error("Lỗi xóa POI");

      // ✅ FIX: Refresh POI list, nhưng không throw error nếu fetchPois fail
      // DELETE đã thành công, không nên block delete dù fetch fail
      try {
        await fetchPois();
      } catch (error) {
        console.warn(
          "Cảnh báo: Không thể tải lại danh sách POI, vui lòng refresh",
          error,
        );
        // Không throw error - DELETE đã thành công, POI đã xóa khỏi DB
      }
    },
    [token, fetchPois],
  );

  return { pois, setPois, loading, fetchPois, savePoi, deletePoi };
};
