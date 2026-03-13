import { useState, useCallback } from "react";
import { Tour } from "../types";

export const useTours = (token: string | null) => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTours = useCallback(async () => {
    setLoading(true);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/tours", { headers });
      if (res.status === 401) {
        localStorage.removeItem("authToken");
        window.location.href = "/"; // Redirect to login
        throw new Error("Session hết hạn");
      }

      if (!res.ok) throw new Error("Lỗi tải Tours");

      // if (!res.ok) throw new Error("Lỗi tải Tours");
      const data = await res.json();
      setTours(data);
    } catch (error) {
      console.error(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const saveTour = useCallback(
    async (tour: Partial<Tour>) => {
      const method = tour.id ? "PUT" : "POST";
      const url = tour.id ? `/api/tours/${tour.id}` : "/api/tours";

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(tour),
      });

      if (!res.ok) throw new Error("Lỗi lưu Tour");

      // ✅ FIX: Refresh tours list, nhưng không throw error nếu fetchTours fail
      // POST đã thành công, không nên block save dù fetch fail
      try {
        await fetchTours();
      } catch (error) {
        console.warn(
          "Cảnh báo: Không thể tải lại danh sách tour, vui lòng refresh",
          error,
        );
        // Không throw error - POST đã thành công, tour đã insert vào DB
      }
    },
    [token, fetchTours],
  );

  const deleteTour = useCallback(
    async (id: number) => {
      const headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`/api/tours/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error("Lỗi xóa Tour");

      // ✅ FIX: Refresh tour list, nhưng không throw error nếu fetchTours fail
      // DELETE đã thành công, không nên block delete dù fetch fail
      try {
        await fetchTours();
      } catch (error) {
        console.warn(
          "Cảnh báo: Không thể tải lại danh sách tour, vui lòng refresh",
          error,
        );
        // Không throw error - DELETE đã thành công, tour đã xóa khỏi DB
      }
    },
    [token, fetchTours],
  );

  return { tours, setTours, loading, fetchTours, saveTour, deleteTour };
};
