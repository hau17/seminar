// ✅ v1.5 Business POI Panel Component
import { useState, useRef, useEffect } from "react";
import { POIType, type BusinessPOI } from "../types";

interface BusinessPoiPanelProps {
  poi?: BusinessPOI;
  token: string;
  onSaved: (poi: BusinessPOI) => void;
  onCancel: () => void;
}

export function BusinessPoiPanel({
  poi,
  token,
  onSaved,
  onCancel,
}: BusinessPoiPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(
    poi?.image_url || null,
  );

  const [form, setForm] = useState({
    name: poi?.name || "",
    type: poi?.type || POIType.MAIN,
    lat: poi?.lat || "",
    lng: poi?.lng || "",
    description: poi?.description || "",
    radius: poi?.radius || "0",
  });

  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn một tệp hình ảnh");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate
      if (!form.name.trim()) {
        throw new Error("Tên điểm không được rỗng");
      }

      const lat = parseFloat(form.lat as any);
      const lng = parseFloat(form.lng as any);
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error("Tọa độ không hợp lệ");
      }

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("type", form.type);
      formData.append("lat", lat.toString());
      formData.append("lng", lng.toString());
      if (form.description) {
        formData.append("description", form.description);
      }
      formData.append("radius", form.radius);

      if (imageFile) {
        formData.append("image", imageFile);
      }

      const url = poi
        ? `/api/businesses/pois/${poi.id}`
        : "/api/businesses/pois";
      const method = poi ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Lỗi lưu POI");
      }

      // For new POIs, fetch the full data
      if (!poi) {
        const getResponse = await fetch("/api/businesses/pois", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (getResponse.ok) {
          const allPois = await getResponse.json();
          const newPoi = allPois[0]; // Most recent is first
          onSaved(newPoi);
        }
      } else {
        // For edits, refetch to get complete data
        const getResponse = await fetch("/api/businesses/pois", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (getResponse.ok) {
          const allPois = await getResponse.json();
          const updated = allPois.find((p: BusinessPOI) => p.id === poi.id);
          if (updated) {
            onSaved(updated);
          } else {
            onSaved(poi); // Fallback
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu POI");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!poi) return;
    if (!confirm("Bạn chắc chắn muốn xóa POI này?")) return;

    setLoading(true);

    try {
      const response = await fetch(`/api/businesses/pois/${poi.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Lỗi xóa POI");
      }

      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa POI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {poi ? "Sửa Điểm Du Lịch" : "Thêm Điểm Du Lịch Mới"}
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên Điểm *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Nhà ga Hạ Long"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Loại Điểm *
              </label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value as POIType })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(POIType).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Coordinates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Latitude *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  placeholder="20.5000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Longitude *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  placeholder="107.0000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Radius */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bán Kính (mét)
              </label>
              <input
                type="number"
                value={form.radius}
                onChange={(e) => setForm({ ...form, radius: e.target.value })}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mô Tả
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Mô tả chi tiết về điểm du lịch"
                rows={4}
                maxLength={1000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {form.description.length}/1000 ký tự
              </p>
            </div>

            {/* Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hình Ảnh
              </label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500 transition"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {previewImage ? (
                  <div>
                    <img
                      src={previewImage}
                      alt="Preview"
                      className="max-h-40 mx-auto mb-2 rounded"
                    />
                    <p className="text-sm text-blue-600">
                      Nhấp để thay đổi hình ảnh
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-600">
                      Nhấp để chọn hình ảnh
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Status Info */}
            {poi && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                <strong>Trạng thái:</strong> {poi.status}
                {poi.status === "Pending" && (
                  <p className="text-xs mt-1">
                    Đang chờ duyệt từ quản trị viên
                  </p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition"
              >
                {loading ? "Đang xử lý..." : poi ? "Cập Nhật" : "Thêm POI"}
              </button>
              {poi && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition"
                >
                  Xóa
                </button>
              )}
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 disabled:bg-gray-400 text-gray-700 font-semibold rounded-lg transition"
              >
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
