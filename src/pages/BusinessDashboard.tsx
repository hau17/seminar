// ✅ v1.8 Business Dashboard - Clean Implementation
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBusinessAuth } from "../context/BusinessAuthContext";
import type { BusinessPOI } from "../types";
import { BusinessPoiPanel } from "../components/BusinessPoiPanel";

export function BusinessDashboard() {
  const navigate = useNavigate();
  const { auth, logout } = useBusinessAuth();
  const [pois, setPois] = useState<BusinessPOI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [editingPoi, setEditingPoi] = useState<BusinessPOI | null>(null);

  // ✅ Fetch POIs when auth token becomes available
  useEffect(() => {
    // Guard: Only fetch if auth exists
    if (!auth?.businessToken) {
      setLoading(false);
      return;
    }

    let isMounted = true; // Prevent state update on unmounted component

    const fetchPois = async () => {
      try {
        const response = await fetch("/api/businesses/pois", {
          headers: { Authorization: `Bearer ${auth.businessToken}` },
        });

        if (!response.ok) {
          throw new Error(
            `Failed to fetch POIs: ${response.status} ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        // Handle both grouped response and array response
        const poiList = Array.isArray(data)
          ? data
          : [
              ...(data.pending || []),
              ...(data.approved || []),
              ...(data.rejected || []),
            ];
        setPois(poiList);
        setError("");
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPois();

    // ✅ Cleanup: Prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [auth?.businessToken]);

  const handleOpenPanel = () => {
    setEditingPoi(null);
    setShowPanel(true);
  };

  const handleEditPoi = (poi: BusinessPOI) => {
    if (poi.status === "Approved") {
      setError("Không thể chỉnh sửa POI đã được duyệt");
      return;
    }
    setEditingPoi(poi);
    setShowPanel(true);
  };

  const handlePoiSaved = (newPoi: BusinessPOI) => {
    if (editingPoi) {
      setPois(pois.map((p) => (p.id === newPoi.id ? newPoi : p)));
    } else {
      setPois([newPoi, ...pois]);
    }
    setShowPanel(false);
    setEditingPoi(null);
  };

  const handlePoiDeleted = (poiId: number) => {
    setPois(pois.filter((p) => p.id !== poiId));
  };

  const getStatusBadge = (status: string) => {
    const badgeClasses = {
      Pending:
        "inline-block px-2 py-1 text-xs font-semibold text-yellow-700 bg-yellow-100 rounded",
      Approved:
        "inline-block px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded",
      Rejected:
        "inline-block px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded",
    };
    return (
      badgeClasses[status as keyof typeof badgeClasses] || badgeClasses.Pending
    );
  };

  // ✅ Separate POIs by status
  const pendingPois = pois.filter((p) => p.status === "Pending");
  const approvedPois = pois.filter((p) => p.status === "Approved");
  const rejectedPois = pois.filter((p) => p.status === "Rejected");

  // ✅ Show loading while fetching
  if (loading && pois.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600 mx-auto mb-4"></div>
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
              {auth?.companyName || "Cổng Doanh Nghiệp"}
            </h1>
            <p className="text-sm text-gray-600">{auth?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate("/business/auth", { replace: true });
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
          >
            Đăng Xuất
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Section Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Các Điểm Du Lịch
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Quản lý các điểm du lịch và gửi yêu cầu duyệt
            </p>
          </div>
          <button
            onClick={handleOpenPanel}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
          >
            <span>+</span>
            Thêm POI Mới
          </button>
        </div>

        {/* POI Panel */}
        {showPanel && (
          <BusinessPoiPanel
            poi={editingPoi || undefined}
            token={auth?.businessToken || ""}
            onSaved={handlePoiSaved}
            onCancel={() => {
              setShowPanel(false);
              setEditingPoi(null);
            }}
          />
        )}

        {/* POIs List - By Status */}
        {pois.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-gray-600 mb-4">Chưa có điểm du lịch nào</p>
            <button
              onClick={handleOpenPanel}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Tạo điểm du lịch đầu tiên
            </button>
          </div>
        ) : (
          <div className="space-y-12">
            {/* ✅ PENDING POIs */}
            {pendingPois.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-yellow-700 mb-4">
                  ⏳ Chờ duyệt ({pendingPois.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pendingPois.map((poi) => (
                    <div
                      key={poi.id}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
                    >
                      {poi.image_url && (
                        <img
                          src={poi.image_url}
                          alt={poi.name}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg text-gray-900">
                            {poi.name}
                          </h4>
                          <span className={getStatusBadge(poi.status)}>
                            {poi.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{poi.type}</p>
                        {poi.description && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {poi.description}
                          </p>
                        )}
                        <div className="text-xs text-gray-500 mb-4">
                          {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPoi(poi)}
                            className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium transition"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Bạn chắc chắn muốn xóa POI này?")) {
                                fetch(`/api/businesses/pois/${poi.id}`, {
                                  method: "DELETE",
                                  headers: {
                                    Authorization: `Bearer ${auth?.businessToken}`,
                                  },
                                }).then((res) => {
                                  if (res.ok) {
                                    handlePoiDeleted(poi.id);
                                  } else {
                                    setError("Không thể xóa POI");
                                  }
                                });
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
              </section>
            )}

            {/* ✅ APPROVED POIs */}
            {approvedPois.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-green-700 mb-4">
                  ✅ Đã duyệt ({approvedPois.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {approvedPois.map((poi) => (
                    <div
                      key={poi.id}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden"
                    >
                      {poi.image_url && (
                        <img
                          src={poi.image_url}
                          alt={poi.name}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg text-gray-900">
                            {poi.name}
                          </h4>
                          <span className={getStatusBadge(poi.status)}>
                            {poi.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{poi.type}</p>
                        {poi.description && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {poi.description}
                          </p>
                        )}
                        <div className="text-xs text-gray-500 mb-4">
                          {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                        </div>
                        <button
                          disabled
                          className="w-full px-3 py-2 bg-gray-100 text-gray-500 rounded text-sm font-medium cursor-not-allowed"
                          title="POI đã duyệt. Gửi yêu cầu sửa nếu cần thay đổi."
                        >
                          Đã duyệt (chỉ đọc)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ✅ REJECTED POIs */}
            {rejectedPois.length > 0 && (
              <section>
                <h3 className="text-xl font-bold text-red-700 mb-4">
                  ❌ Bị trả về ({rejectedPois.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rejectedPois.map((poi) => (
                    <div
                      key={poi.id}
                      className="bg-white rounded-lg shadow hover:shadow-lg transition overflow-hidden border-2 border-red-200"
                    >
                      {poi.image_url && (
                        <img
                          src={poi.image_url}
                          alt={poi.name}
                          className="w-full h-48 object-cover"
                        />
                      )}
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg text-gray-900">
                            {poi.name}
                          </h4>
                          <span className={getStatusBadge(poi.status)}>
                            {poi.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{poi.type}</p>
                        {poi.reject_reason && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded">
                            <strong className="text-red-700 text-sm">
                              Lý do từ chối:
                            </strong>
                            <p className="text-sm text-red-700 mt-1">
                              {poi.reject_reason}
                            </p>
                          </div>
                        )}
                        {poi.description && (
                          <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                            {poi.description}
                          </p>
                        )}
                        <div className="text-xs text-gray-500 mb-4">
                          {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditPoi(poi)}
                            className="flex-1 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium transition"
                          >
                            Sửa & Gửi lại
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Bạn chắc chắn muốn xóa POI này?")) {
                                fetch(`/api/businesses/pois/${poi.id}`, {
                                  method: "DELETE",
                                  headers: {
                                    Authorization: `Bearer ${auth?.businessToken}`,
                                  },
                                }).then((res) => {
                                  if (res.ok) {
                                    handlePoiDeleted(poi.id);
                                  } else {
                                    setError("Không thể xóa POI");
                                  }
                                });
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
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
