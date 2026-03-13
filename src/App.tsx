import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ChevronRight,
  Menu,
  Info,
  Map as MapIcon,
  Layers,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { POI, POIType, Tour } from "./types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ToastContainer } from "./components/Toast";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { LoginPage } from "./components/LoginPage";
import { validatePOI, validateTour } from "./utils/validation";
import { usePOIs } from "./hooks/usePOIs";
import { useTours } from "./hooks/useTours";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Fix Leaflet marker icons
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const POI_ICONS: Record<POIType, string> = {
  [POIType.MAIN]: "📍",
  [POIType.WC]: "🚻",
  [POIType.TICKET]: "🎫",
  [POIType.PARKING]: "🅿️",
  [POIType.PORT]: "⚓",
};

export default function App() {
  // Auth state - moved to top level to fix hooks violation
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("admin@example.com");
  const [loginPassword, setLoginPassword] = useState("password");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<"pois" | "tours">("tours");
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [isEditingPoi, setIsEditingPoi] = useState(false);
  const [newPoiPos, setNewPoiPos] = useState<[number, number] | null>(null);
  const [isCreatingTour, setIsCreatingTour] = useState(false);
  const [currentTour, setCurrentTour] = useState<Partial<Tour>>({
    title: "",
    poi_ids: [],
  });
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type: "error" | "success" }>
  >([]);

  // Use custom hooks for API management (with token)
  const {
    pois,
    loading: loadingPois,
    fetchPois,
    savePoi,
    deletePoi,
  } = usePOIs(authToken);
  const {
    tours,
    loading: loadingTours,
    fetchTours,
    saveTour,
    deleteTour,
  } = useTours(authToken);

  const showToast = (message: string, type: "error" | "success" = "error") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    if (savedToken) {
      setAuthToken(savedToken);
      setIsLoggedIn(true);
    }
  }, []);

  // ✅ FIX #1: Auto-fetch POIs/Tours after login (FR-02.1, FR-03.1)
  useEffect(() => {
    if (isLoggedIn && authToken) {
      fetchPois().catch(err => console.error("Failed to load POIs:", err));
      fetchTours().catch(err => console.error("Failed to load Tours:", err));
    }
  }, [isLoggedIn, authToken, fetchPois, fetchTours]);

  const handleSavePoi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoi) return;

    // Validate
    const validationError = validatePOI(selectedPoi);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    try {
      await savePoi(selectedPoi);
      setIsEditingPoi(false);
      setSelectedPoi(null);
      setNewPoiPos(null);
      showToast(
        selectedPoi.id ? "Cập nhật POI thành công" : "Tạo POI thành công",
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("Lỗi lưu POI", "error");
    }
  };

  const handleDeletePoi = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa điểm này?")) return;
    try {
      await deletePoi(id);
      setSelectedPoi(null);
      showToast("Xóa POI thành công", "success");
    } catch (error) {
      console.error(error);
      showToast("Lỗi xóa POI", "error");
    }
  };

  const handleSaveTour = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTour.title || currentTour.poi_ids?.length === 0) return;

    // Validate
    const validationError = validateTour(currentTour as Tour);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    try {
      await saveTour(currentTour);
      setIsCreatingTour(false);
      setCurrentTour({ title: "", poi_ids: [] });
      showToast("Tạo Tour thành công", "success");
    } catch (error) {
      console.error(error);
      showToast("Lỗi lưu Tour", "error");
    }
  };

  const handleDeleteTour = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tour này?")) return;
    try {
      await deleteTour(id);
      showToast("Xóa Tour thành công", "success");
    } catch (error) {
      console.error(error);
      showToast("Lỗi xóa Tour", "error");
    }
  };

  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (activeTab === "pois" && !isEditingPoi) {
          setNewPoiPos([e.latlng.lat, e.latlng.lng]);
          setSelectedPoi({
            name: "",
            type: POIType.MAIN,
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            description: "",
          });
          setIsEditingPoi(true);
        }
      },
    });
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Đăng nhập thất bại");
      }

      const { token } = await res.json();
      localStorage.setItem("authToken", token);

      setAuthToken(token);
      setIsLoggedIn(true);

      // setAuthToken(token);
      // setIsLoggedIn(true);
      // setActiveTab("tours");
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : "Lỗi không xác định",
      );
    } finally {
      setLoginLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <LoginPage
        email={loginEmail}
        password={loginPassword}
        error={loginError}
        loading={loginLoading}
        onEmailChange={setLoginEmail}
        onPasswordChange={setLoginPassword}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <div className="h-full flex bg-zinc-950 text-zinc-100 overflow-hidden">
      {" "}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* Sidebar */}
      <aside className="w-80 border-r border-zinc-800 flex flex-col bg-zinc-900/50 backdrop-blur-xl">
        <div className="p-6 border-bottom border-zinc-800">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Navigation className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">TourAdmin</span>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("pois")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                activeTab === "pois"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "text-zinc-400 hover:bg-zinc-800",
              )}
            >
              <MapPin className="w-5 h-5" />
              <span className="font-medium">Quản lý POIs</span>
            </button>
            <button
              onClick={() => setActiveTab("tours")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                activeTab === "tours"
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "text-zinc-400 hover:bg-zinc-800",
              )}
            >
              <Layers className="w-5 h-5" />
              <span className="font-medium">Quản lý Tours</span>
            </button>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === "pois" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Danh sách POIs
                </h3>
                <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded-full text-zinc-400">
                  {loadingPois ? "..." : pois.length}
                </span>
              </div>
              {pois.map((poi) => (
                <div
                  key={poi.id}
                  onClick={() => setSelectedPoi(poi)}
                  className={cn(
                    "p-4 rounded-xl border transition-all cursor-pointer group",
                    selectedPoi?.id === poi.id
                      ? "bg-zinc-800 border-zinc-700"
                      : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <span className="text-xl">{POI_ICONS[poi.type]}</span>
                      <div>
                        <h4 className="font-semibold text-sm">{poi.name}</h4>
                        <p className="text-xs text-zinc-500">{poi.type}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPoi(poi);
                          setIsEditingPoi(true);
                        }}
                        className="p-2 text-zinc-500 hover:text-emerald-400 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePoi(poi.id!);
                        }}
                        className="p-2 text-zinc-500 hover:text-red-400 transition-all"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                  Danh sách Tours
                </h3>
                <button
                  onClick={() => setIsCreatingTour(true)}
                  className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {tours.map((tour) => (
                <div
                  key={tour.id}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm">{tour.title}</h4>
                    <button
                      onClick={() => handleDeleteTour(tour.id!)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-zinc-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tour.poi_ids.map((id, idx) => {
                      const poi = pois.find((p) => p.id === id);
                      return (
                        <div key={idx} className="flex items-center">
                          <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded-md text-zinc-400">
                            {poi?.name || "Unknown"}
                          </span>
                          {idx < tour.poi_ids.length - 1 && (
                            <ChevronRight className="w-3 h-3 text-zinc-700" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800">
          <button
            onClick={() => {
              localStorage.removeItem("authToken"); 
              setIsLoggedIn(false);
              setAuthToken(null);
            }}
            className="w-full flex items-center justify-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>
      {/* Main Content (Map) */}
      <main className="flex-1 relative h-full">
        <MapContainer
          center={[16.047, 108.206]}
          zoom={13}
          className="h-full w-full z-0"
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          <MapEvents />

          {pois.map((poi) => (
            <Marker
              key={poi.id}
              position={[poi.lat, poi.lng]}
              eventHandlers={{
                click: () => {
                  setSelectedPoi(poi);
                  setIsEditingPoi(false);
                },
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-zinc-900">{poi.name}</h3>
                  <p className="text-xs text-zinc-600">{poi.type}</p>
                  {poi.description && (
                    <p className="text-xs mt-2 text-zinc-500">
                      {poi.description}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* New POI Marker */}
          {newPoiPos && <Marker position={newPoiPos} />}

          {/* Tour Preview Line */}
          {activeTab === "tours" &&
            tours.map((tour) => {
              const positions = tour.poi_ids
                .map((id) => pois.find((p) => p.id === id))
                .filter((p) => p !== undefined)
                .map((p) => [p!.lat, p!.lng] as [number, number]);

              return (
                <Polyline
                  key={tour.id}
                  positions={positions}
                  color="#10b981"
                  weight={3}
                  opacity={0.6}
                  dashArray="10, 10"
                />
              );
            })}
        </MapContainer>

        {/* Overlays */}
        <AnimatePresence>
          {isEditingPoi && selectedPoi && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="absolute top-0 right-0 h-full w-96 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 z-10 p-8 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">
                  {selectedPoi.id ? "Sửa POI" : "Thêm POI mới"}
                </h2>
                <button
                  onClick={() => {
                    setIsEditingPoi(false);
                    setSelectedPoi(null);
                    setNewPoiPos(null);
                  }}
                  className="p-2 hover:bg-zinc-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePoi} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    Tên điểm
                  </label>
                  <input
                    required
                    value={selectedPoi.name}
                    onChange={(e) =>
                      setSelectedPoi({ ...selectedPoi, name: e.target.value })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                    placeholder="Nhập tên điểm tham quan..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    Loại điểm
                  </label>
                  <select
                    value={selectedPoi.type}
                    onChange={(e) =>
                      setSelectedPoi({
                        ...selectedPoi,
                        type: e.target.value as POIType,
                      })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                  >
                    {Object.values(POIType).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    Mô tả
                  </label>
                  <textarea
                    value={selectedPoi.description}
                    onChange={(e) =>
                      setSelectedPoi({
                        ...selectedPoi,
                        description: e.target.value,
                      })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 h-32 focus:outline-none focus:border-emerald-500"
                    placeholder="Mô tả chi tiết về địa điểm này..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                      Vĩ độ (Lat)
                    </label>
                    <input
                      disabled
                      value={selectedPoi.lat.toFixed(6)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                      Kinh độ (Lng)
                    </label>
                    <input
                      disabled
                      value={selectedPoi.lng.toFixed(6)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-500 text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  Lưu địa điểm
                </button>
              </form>
            </motion.div>
          )}

          {isCreatingTour && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="absolute top-0 right-0 h-full w-96 bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 z-10 p-8 shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold">Tạo Tour mới</h2>
                <button
                  onClick={() => setIsCreatingTour(false)}
                  className="p-2 hover:bg-zinc-800 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTour} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    Tên Tour
                  </label>
                  <input
                    required
                    value={currentTour.title}
                    onChange={(e) =>
                      setCurrentTour({ ...currentTour, title: e.target.value })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                    placeholder="Nhập tên lộ trình..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    Chọn POIs (theo thứ tự)
                  </label>
                  <div className="space-y-2 mt-2">
                    {pois.map((poi) => {
                      const isSelected = currentTour.poi_ids?.includes(poi.id!);
                      const order = currentTour.poi_ids?.indexOf(poi.id!) ?? -1;

                      return (
                        <button
                          key={poi.id}
                          type="button"
                          onClick={() => {
                            const newIds = [...(currentTour.poi_ids || [])];
                            if (isSelected) {
                              newIds.splice(order, 1);
                            } else {
                              newIds.push(poi.id!);
                            }
                            setCurrentTour({ ...currentTour, poi_ids: newIds });
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                            isSelected
                              ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span>{POI_ICONS[poi.type]}</span>
                            <span className="text-sm font-medium">
                              {poi.name}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="w-6 h-6 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                              {order + 1}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    !currentTour.title || currentTour.poi_ids?.length === 0
                  }
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  Lưu lộ trình
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Legend */}
        <div className="absolute bottom-8 left-8 z-10 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl shadow-xl">
          <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">
            Chú thích
          </h5>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {Object.entries(POI_ICONS).map(([type, icon]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <span className="text-[10px] text-zinc-400">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
