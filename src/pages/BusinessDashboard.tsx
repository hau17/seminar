// Business Dashboard — v1.6 schema aligned
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusinessAuth } from "../context/BusinessAuthContext";
import type { POI } from "../types";
import { BusinessPoiPanel } from "../components/BusinessPoiPanel";

export function BusinessDashboard() {
  const navigate = useNavigate();
  const { auth, logout } = useBusinessAuth();
  const [pois, setPois] = useState<POI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [editingPoi, setEditingPoi] = useState<(POI & { id: number }) | null>(null);

  const token = auth?.token ?? null;

  const fetchPois = async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/business/pois", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPois(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth) { navigate("/business/auth", { replace: true }); return; }
    fetchPois();
  }, [auth]);

  const handlePoiSaved = () => {
    setShowPanel(false);
    setEditingPoi(null);
    fetchPois();
  };

  if (loading && pois.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {auth?.business?.name || "Cổng Doanh Nghiệp"}
            </h1>
            <p className="text-sm text-gray-600">{auth?.business?.email}</p>
          </div>
          <button
            onClick={() => { logout(); navigate("/business/auth", { replace: true }); }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
          >
            Đăng Xuất
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Các Điểm Du Lịch</h2>
            <p className="text-sm text-gray-600 mt-1">{pois.length} điểm du lịch</p>
          </div>
          <button
            onClick={() => { setEditingPoi(null); setShowPanel(true); }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            <span>+</span> Thêm POI Mới
          </button>
        </div>

        {showPanel && (
          <BusinessPoiPanel
            poi={editingPoi || undefined}
            token={token || ""}
            onSaved={handlePoiSaved}
            onCancel={() => { setShowPanel(false); setEditingPoi(null); }}
          />
        )}

        {pois.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 mb-4">Chưa có điểm du lịch nào</p>
            <button
              onClick={() => { setEditingPoi(null); setShowPanel(true); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Tạo điểm du lịch đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pois.map((poi) => (
              <div
                key={poi.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
              >
                {/* Thumbnail */}
                {poi.images?.[0] && (
                  <img
                    src={poi.images[0].file_path}
                    alt={poi.name}
                    className="w-full h-40 object-cover"
                    onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                  />
                )}
                <div className="p-4">
                  <h4 className="font-bold text-lg text-gray-900 mb-1">{poi.name}</h4>
                  {poi.description && (
                    <p className="text-sm text-gray-700 mb-2 line-clamp-2">{poi.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-3">
                    📍 {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                    {poi.range_m ? ` · ${poi.range_m}m` : ""}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingPoi(poi as POI & { id: number }); setShowPanel(true); }}
                      className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium transition"
                    >
                      Sửa
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Xóa POI này?")) return;
                        const res = await fetch(`/api/business/pois/${poi.id}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        const data = await res.json();
                        if (res.status === 409) {
                          setError(`Không thể xóa: POI đang trong Tour: ${data.tours?.map((t: any) => t.name).join(", ")}`);
                        } else if (res.ok) {
                          setPois((p) => p.filter((x) => x.id !== poi.id));
                        } else {
                          setError(data.error || "Lỗi xóa POI");
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium transition"
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
