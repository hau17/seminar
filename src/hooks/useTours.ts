import { useState, useCallback } from "react";
import { Tour } from "../types";

export const useTours = (token: string | null) => {
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(false);

  const authHeaders = (): HeadersInit =>
    token ? { Authorization: `Bearer ${token}` } : {};

  const fetchTours = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/tours", { headers: authHeaders() });
      if (res.status === 401) {
        localStorage.removeItem("adminToken");
        window.location.href = "/";
        throw new Error("Session hết hạn");
      }
      if (!res.ok) throw new Error("Lỗi tải Tours");
      const data = await res.json();
      setTours(data);
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * saveTour — create or update a Tour.
   * @param tour            Partial Tour (id present → PUT)
   * @param newImageFiles   New images to upload
   * @param deleteImageIds  IDs of tour_images to delete on PUT
   */
  const saveTour = useCallback(
    async (
      tour: Partial<Tour>,
      newImageFiles?: File[],
      deleteImageIds?: number[]
    ) => {
      const isEdit = !!tour.id;
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/admin/tours/${tour.id}` : "/api/admin/tours";

      const formData = new FormData();
      formData.append("name", tour.name || "");
      if (tour.description !== undefined) {
        formData.append("description", tour.description || "");
      }
      formData.append("poi_ids", JSON.stringify(tour.poi_ids || []));

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
        throw new Error(err.error || "Lỗi lưu Tour");
      }

      try {
        await fetchTours();
      } catch (e) {
        console.warn("Không thể reload danh sách Tour:", e);
      }
    },
    [token, fetchTours] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const deleteTour = useCallback(
    async (id: number) => {
      const res = await fetch(`/api/admin/tours/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Lỗi xóa Tour");
      }
      try {
        await fetchTours();
      } catch (e) {
        console.warn("Không thể reload danh sách Tour:", e);
      }
    },
    [token, fetchTours] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const translateTour = useCallback(
    async (tourId: number, langCode: string) => {
      const res = await fetch("/api/tours/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ tour_id: tourId, language_code: langCode }),
      });
      if (!res.ok) throw new Error("Chưa thể dịch Tour lúc này");
      const json = await res.json();
      return json; // { translated_name, translated_description }
    },
    [token] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { tours, setTours, loading, fetchTours, saveTour, deleteTour, translateTour };
};
