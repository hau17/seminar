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
    async (poi: POI) => {
      const method = poi.id ? "PUT" : "POST";
      const url = poi.id ? `/api/pois/${poi.id}` : "/api/pois";

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(poi),
      });

      if (!res.ok) throw new Error("Lỗi lưu POI");

      // ✅ FIX: Refresh POI list, nhưng không throw error nếu fetchPois fail
      // POST đã thành công, không nên block save dù fetch fail
      try {
        await fetchPois();
      } catch (error) {
        console.warn(
          "Cảnh báo: Không thể tải lại danh sách POI, vui lòng refresh",
          error,
        );
        // Không throw error - POST đã thành công, POI đã insert vào DB
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
