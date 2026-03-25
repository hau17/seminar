// Business POI Panel — create/edit POI for business portal
import React, { useState, useRef } from "react";
import { POI, POIImage } from "../../types";
import { useBusinessPoiForm, BusinessPOI } from "../../hooks/useBusinessPoiForm";



interface BusinessPoiPanelProps {
  poi?: BusinessPOI;
  token: string;
  onSaved: () => void;
  onCancel: () => void;
}

function ImageGrid({ images }: { images?: POIImage[] }) {
  if (!images?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {images.map((img) => (
        <img
          key={img.id}
          src={img.file_path}
          className="h-12 w-12 object-cover rounded-lg border border-gray-200"
          alt=""
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      ))}
    </div>
  );
}

export function BusinessPoiPanel({ poi, token, onSaved, onCancel }: BusinessPoiPanelProps) {
  const {
    form, setForm,
    newFiles, setNewFiles,
    deleteIds, setDeleteIds,
    existingImages, totalCount,
    loading, error,
    handleFileChange, handleSubmit, handleDelete
  } = useBusinessPoiForm(poi, token, onSaved);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileChange(files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-xl font-bold">
              {poi ? "Sửa Điểm Du Lịch" : "Thêm Điểm Du Lịch Mới"}
            </h2>
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên POI *</label>
              <input
                type="text"
                maxLength={255}
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả *</label>
              <textarea
                rows={4}
                required
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Mô tả chi tiết về điểm du lịch..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
              />
            </div>

            {/* Lat / Lng */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vĩ độ (Lat) *</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={form.lat}
                  onChange={(e) => setForm({ ...form, lat: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kinh độ (Lng) *</label>
                <input
                  type="number"
                  step="0.000001"
                  required
                  value={form.lng}
                  onChange={(e) => setForm({ ...form, lng: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phạm vi (mét)</label>
              <input
                type="number"
                min={0}
                value={form.range_m}
                onChange={(e) => setForm({ ...form, range_m: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh (tối đa 5)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {existingImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img src={img.file_path} className="h-16 w-16 object-cover rounded-lg" alt="" />
                    <button
                      type="button"
                      onClick={() => setDeleteIds((p) => [...p, img.id])}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                  </div>
                ))}
                {newFiles.map((f, idx) => (
                  <div key={idx} className="relative group">
                    <img src={URL.createObjectURL(f)} className="h-16 w-16 object-cover rounded-lg ring-2 ring-blue-300 opacity-80" alt="" />
                    <button
                      type="button"
                      onClick={() => setNewFiles((p) => p.filter((_, i) => i !== idx))}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                  </div>
                ))}
              </div>
              {totalCount < 5 && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    + Thêm ảnh ({totalCount}/5)
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={onFileChange}
                    className="hidden"
                  />
                </>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg transition-colors text-sm"
              >
                {loading ? "Đang xử lý..." : poi ? "Cập Nhật" : "Thêm POI"}
              </button>
              {poi && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors text-sm"
                >
                  Xóa
                </button>
              )}
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors text-sm"
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
