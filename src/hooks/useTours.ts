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

  // ✅ PHASE 2 C6: saveTour now accepts imageFile parameter for multipart
  const saveTour = useCallback(
    async (tour: Partial<Tour>, imageFile?: File, removeImage?: boolean) => {
      const method = tour.id ? "PUT" : "POST";
      const url = tour.id ? `/api/tours/${tour.id}` : "/api/tours";

      let headers: HeadersInit = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // ✅ FIX: ALWAYS use FormData for POST/PUT tours (multipart/form-data required by backend)
      // Do NOT set Content-Type header - let browser auto-generate with boundary
      const formData = new FormData();
      formData.append("title", tour.title || "");

      // Append description if present
      if (tour.description) {
        formData.append("description", tour.description);
      }

      // Append poi_ids as JSON string
      formData.append("poi_ids", JSON.stringify(tour.poi_ids || []));

      // Append image file if uploading new image
      if (imageFile) {
        formData.append("image", imageFile);
      }

      // Append flag to remove image from server
      if (removeImage) {
        formData.append("remove_image", "true");
      }

      const res = await fetch(url, {
        method,
        headers,
        body: formData,
        // IMPORTANT: Do NOT set Content-Type header here
        // Browser will automatically set Content-Type: multipart/form-data with correct boundary
      });

      if (!res.ok) throw new Error("Lỗi lưu Tour");

      // ✅ FIX: Refresh tours list, nhưng không throw error nếu fetchTours fail
      // POST/PUT đã thành công, không nên block save dù fetch fail
      try {
        await fetchTours();
      } catch (error) {
        console.warn(
          "Cảnh báo: Không thể tải lại danh sách tour, vui lòng refresh",
          error,
        );
        // Không throw error - POST/PUT đã thành công, tour đã insert/update vào DB
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
