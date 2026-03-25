import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
  Circle,
} from "react-leaflet";
import L from "leaflet";
import {
  MapPin,
  Navigation,
  LogOut,
  Plus,
  Trash2,
  Edit2,
  X,
  BarChart2,
  Layers,
  Building2,
  Image as ImageIcon,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { POI, Tour, DashboardStats, TourPOI, POIImage, TourImage } from "../../types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ToastContainer } from "../../components/common/Toast";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { LoginPage } from "../auth/LoginPage";
import { AdminBusinessesSection } from "./AdminBusinessesSection";
import { POIDetailModal } from "../poi/POIDetailModal";
import { validatePOI, validateTour } from "../../utils/validation";
import { usePOIs } from "../../hooks/usePOIs";
import { useTours } from "../../hooks/useTours";

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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Map marker icons ──────────────────────────────────────────────────────────
const getMarkerIcon = (isSelected: boolean, tourPosition?: number) => {
  const bg = isSelected ? "#f59e0b" : "#22c55e";
  const label = tourPosition !== undefined ? String(tourPosition) : "📍";
  return L.divIcon({
    html: `<div style="
      background-color:${bg};width:36px;height:36px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:${tourPosition !== undefined ? "14px" : "18px"};font-weight:700;color:white;
      border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);cursor:pointer;"
    >${label}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
    className: "custom-marker",
  });
};

// ─── Image thumb grid ──────────────────────────────────────────────────────────
function ImageGrid({ images, size = "sm" }: { images?: POIImage[] | TourImage[]; size?: "sm" | "md" }) {
  if (!images?.length) return null;
  const h = size === "sm" ? "h-14" : "h-24";
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {images.map((img) => (
        <img
          key={img.id}
          src={img.file_path}
          className={`${h} w-auto rounded object-cover border border-slate-200`}
          alt=""
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      ))}
    </div>
  );
}

// ─── Multi-image uploader ──────────────────────────────────────────────────────
interface MultiImageUploaderProps {
  existingImages?: (POIImage | TourImage)[];
  pendingFiles: File[];
  onAddFiles: (files: File[]) => void;
  onDeleteExisting: (id: number) => void;
  onRemovePending: (index: number) => void;
  maxTotal?: number;
}
function MultiImageUploader({
  existingImages = [],
  pendingFiles,
  onAddFiles,
  onDeleteExisting,
  onRemovePending,
  maxTotal = 5,
}: MultiImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const totalCount = existingImages.length + pendingFiles.length;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const allowed = maxTotal - totalCount;
    if (allowed <= 0) return;
    const valid = files.filter((f) => {
      if (f.size > 5 * 1024 * 1024) return false;
      return ["image/jpeg", "image/png", "image/webp"].includes(f.type);
    });
    onAddFiles(valid.slice(0, allowed));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {existingImages.map((img) => (
          <div key={img.id} className="relative group">
            <img
              src={img.file_path}
              className="h-16 w-16 object-cover rounded-lg border border-slate-200"
              alt=""
              onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
            />
            <button
              type="button"
              onClick={() => onDeleteExisting(img.id)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}
        {pendingFiles.map((f, idx) => (
          <div key={idx} className="relative group">
            <img
              src={URL.createObjectURL(f)}
              className="h-16 w-16 object-cover rounded-lg border border-slate-200 opacity-70 ring-2 ring-emerald-300"
              alt=""
            />
            <button
              type="button"
              onClick={() => onRemovePending(idx)}
              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      {totalCount < maxTotal && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-600 transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            Thêm ảnh ({totalCount}/{maxTotal})
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleChange}
            className="hidden"
          />
        </>
      )}
      {totalCount >= maxTotal && (
        <p className="text-xs text-amber-600">Đã đạt tối đa {maxTotal} ảnh.</p>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AdminDashboard() {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("admin@gmail.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"dashboard" | "pois" | "tours" | "businesses">("dashboard");

  // ── Maps ─────────────────────────────────────────────────────────────────────
  const mapRef = useRef<L.Map | null>(null);

  // ── POI state ────────────────────────────────────────────────────────────────
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [isEditingPoi, setIsEditingPoi] = useState(false);
  const [newPoiPos, setNewPoiPos] = useState<[number, number] | null>(null);
  const [poiSearchText, setPoiSearchText] = useState("");

  // POI form state
  const [poiForm, setPoiForm] = useState<Partial<POI>>({
    name: "", description: "", lat: 0, lng: 0, range_m: 0,
  });
  const [poiNewImages, setPoiNewImages] = useState<File[]>([]);
  const [poiDeleteImageIds, setPoiDeleteImageIds] = useState<number[]>([]);

  // ── Tour state ───────────────────────────────────────────────────────────────
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);
  const [isCreatingTour, setIsCreatingTour] = useState(false);
  const [isEditingTour, setIsEditingTour] = useState(false);
  const [editingTourId, setEditingTourId] = useState<number | null>(null);
  const [tourSearchText, setTourSearchText] = useState("");
  const [tourPoiSearchText, setTourPoiSearchText] = useState("");
  const [showTourModal, setShowTourModal] = useState(false);

  // Tour form state
  const [tourForm, setTourForm] = useState<Partial<Tour>>({
    name: "", description: "", poi_ids: [],
  });
  const [tourNewImages, setTourNewImages] = useState<File[]>([]);
  const [tourDeleteImageIds, setTourDeleteImageIds] = useState<number[]>([]);

  // ── Dashboard stats ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // ── Misc ─────────────────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "error" | "success" }>>([]);
  const [operationLoading, setOperationLoading] = useState(false);

  // ── Hooks ────────────────────────────────────────────────────────────────────
  const { pois, loading: loadingPois, fetchPois, savePoi, deletePoi, deleteBusinessPoi } = usePOIs(authToken);
  const { tours, loading: loadingTours, fetchTours, saveTour, deleteTour } = useTours(authToken);

  // ─── Toast helpers ────────────────────────────────────────────────────────────
  const showToast = (message: string, type: "error" | "success" = "error") => {
    const id = Date.now().toString();
    setToasts((p) => [...p, { id, message, type }]);
  };
  const removeToast = (id: string) => setToasts((p) => p.filter((t) => t.id !== id));

  // ─── Effects ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (token) { setAuthToken(token); setIsLoggedIn(true); }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !authToken) return;
    fetchPois().catch((e) => { console.error(e); showToast("Lỗi tải POI", "error"); });
    fetchTours().catch((e) => { console.error(e); showToast("Lỗi tải Tour", "error"); });
  }, [isLoggedIn, authToken, fetchPois, fetchTours]);

  // Fetch dashboard stats when tab active
  useEffect(() => {
    if (activeTab !== "dashboard" || !authToken) return;
    setStatsLoading(true);
    fetch("/api/admin/dashboard/stats", {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => showToast("Lỗi tải thống kê", "error"))
      .finally(() => setStatsLoading(false));
  }, [activeTab, authToken]);

  // fitBounds when selecting tour
  useEffect(() => {
    if (!mapRef.current || selectedTourId === null) return;
    const tour = tours.find((t) => t.id === selectedTourId);
    if (!tour?.pois?.length) return;
    const bounds = L.latLngBounds(tour.pois.map((p) => [p.lat, p.lng] as [number, number]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [selectedTourId, tours]);

  useEffect(() => {
    if (activeTab === "pois") setSelectedTourId(null);
  }, [activeTab]);

  // Populate tour form on edit
  useEffect(() => {
    if (!isEditingTour || !editingTourId) return;
    const t = tours.find((x) => x.id === editingTourId);
    if (!t) return;
    const poiIds = t.poi_ids || (t.pois ? t.pois.map((p) => p.poi_id) : []);
    setTourForm({ id: t.id, name: t.name, description: t.description, poi_ids: poiIds });
    setTourNewImages([]);
    setTourDeleteImageIds([]);
  }, [isEditingTour, editingTourId, tours]);

  // ─── Login ────────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch("/api/auth/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || "Đăng nhập thất bại");
      }
      const { token } = await res.json();
      localStorage.setItem("adminToken", token);
      setAuthToken(token);
      setIsLoggedIn(true);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Lỗi không xác định");
    } finally {
      setLoginLoading(false);
    }
  };

  // ─── POI handlers ────────────────────────────────────────────────────────────
  const openPoiCreate = (lat: number, lng: number) => {
    setNewPoiPos([lat, lng]);
    setPoiForm({ name: "", description: "", lat, lng, range_m: 0 });
    setPoiNewImages([]);
    setPoiDeleteImageIds([]);
    setSelectedPoi(null);
    setIsEditingPoi(true);
  };

  const openPoiEdit = (poi: POI) => {
    setPoiForm({ ...poi });
    setPoiNewImages([]);
    setPoiDeleteImageIds([]);
    setSelectedPoi(poi);
    setIsEditingPoi(true);
  };

  const handleSavePoi = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validatePOI(poiForm);
    if (validationErr) { showToast(validationErr, "error"); return; }

    setOperationLoading(true);
    try {
      await savePoi(poiForm, poiNewImages, poiDeleteImageIds);
      setIsEditingPoi(false);
      setSelectedPoi(null);
      setNewPoiPos(null);
      setPoiForm({ name: "", description: "", lat: 0, lng: 0, range_m: 0 });
      setPoiNewImages([]);
      setPoiDeleteImageIds([]);
      showToast(poiForm.id ? "Cập nhật POI thành công" : "Tạo POI thành công", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Lỗi lưu POI", "error");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeletePoi = async (poi: POI) => {
    if (!poi.id) return;
    const confirmed = confirm(
      `Bạn có chắc muốn xóa POI "${poi.name}"? Hành động này không thể hoàn tác.`
    );
    if (!confirmed) return;
    setOperationLoading(true);
    try {
      // BR-01: Mỗi loại POI dùng đúng endpoint — cả hai đều kiểm tra tour_pois trước khi xóa
      const result =
        poi.owner_type === "business"
          ? await deleteBusinessPoi(poi.id)
          : await deletePoi(poi.id);

      if (result.tours?.length) {
        showToast(
          `Không thể xóa POI này vì đang nằm trong Tour: ${result.tours.map((t) => t.name).join(", ")}. Vui lòng xóa POI khỏi các Tour trước.`,
          "error"
        );
        return;
      }
      setSelectedPoi(null);
      setIsEditingPoi(false);
      showToast("Xóa POI thành công", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Lỗi xóa POI", "error");
    } finally {
      setOperationLoading(false);
    }
  };


  // ─── Tour handlers ────────────────────────────────────────────────────────────
  const openTourCreate = () => {
    setTourForm({ name: "", description: "", poi_ids: [] });
    setTourNewImages([]);
    setTourDeleteImageIds([]);
    setIsCreatingTour(true);
    setIsEditingTour(false);
    setEditingTourId(null);
    setShowTourModal(true);
  };

  const openTourEdit = (tour: Tour) => {
    setEditingTourId(tour.id!);
    setIsEditingTour(true);
    setIsCreatingTour(false);
    setShowTourModal(true);
  };

  const handleSaveTour = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErr = validateTour(tourForm as Tour);
    if (validationErr) { showToast(validationErr, "error"); return; }

    setOperationLoading(true);
    try {
      await saveTour(tourForm, tourNewImages, tourDeleteImageIds);
      setIsCreatingTour(false);
      setIsEditingTour(false);
      setShowTourModal(false);
      setEditingTourId(null);
      setTourForm({ name: "", description: "", poi_ids: [] });
      setTourNewImages([]);
      setTourDeleteImageIds([]);
      setSelectedTourId(null);
      showToast(isEditingTour ? "Cập nhật Tour thành công" : "Tạo Tour thành công", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Lỗi lưu Tour", "error");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteTour = async (id: number) => {
    const tour = tours.find((t) => t.id === id);
    if (!confirm(`Bạn có chắc muốn xóa Tour "${tour?.name}"?`)) return;
    setOperationLoading(true);
    try {
      await deleteTour(id);
      showToast("Xóa Tour thành công", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Lỗi xóa Tour", "error");
    } finally {
      setOperationLoading(false);
    }
  };

  // ─── POI picker for Tour form ──────────────────────────────────────────────
  const togglePoiInTour = (poiId: number) => {
    const current = tourForm.poi_ids || [];
    const idx = current.indexOf(poiId);
    if (idx >= 0) {
      setTourForm({ ...tourForm, poi_ids: current.filter((id) => id !== poiId) });
    } else {
      setTourForm({ ...tourForm, poi_ids: [...current, poiId] });
    }
  };

  // ─── Filtered lists ───────────────────────────────────────────────────────
  const filteredPois = useMemo(
    () =>
      pois.filter((p) =>
        p.name.toLowerCase().includes(poiSearchText.toLowerCase())
      ),
    [pois, poiSearchText]
  );

  const filteredTours = useMemo(
    () =>
      tours.filter((t) =>
        t.name.toLowerCase().includes(tourSearchText.toLowerCase())
      ),
    [tours, tourSearchText]
  );

  const selectedTour = useMemo(
    () => tours.find((t) => t.id === selectedTourId),
    [tours, selectedTourId]
  );

  // ── Map helpers ───────────────────────────────────────────────────────────
  const MapEvents = () => {
    const mapInstance = useMap();
    useEffect(() => { mapRef.current = mapInstance; }, [mapInstance]);
    useMapEvents({
      click(e) {
        if (activeTab === "pois" && !isEditingPoi) {
          openPoiCreate(e.latlng.lat, e.latlng.lng);
        }
      },
    });
    return null;
  };

  // ─────────────────────────────────────────────────────────────────────────
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

  const showMap = activeTab === "pois" || activeTab === "tours";

  return (
    <div className="h-full flex bg-slate-50 text-slate-900 overflow-hidden">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className="w-80 border-r border-slate-200 flex flex-col bg-white">
        {/* Logo */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Navigation className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">TourAdmin</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="p-4 space-y-1 border-b border-slate-100">
          {(
            [
              { key: "dashboard", icon: <BarChart2 className="w-4 h-4" />, label: "Dashboard" },
              { key: "pois",      icon: <MapPin className="w-4 h-4" />,    label: "Quản lý POI" },
              { key: "tours",     icon: <Layers className="w-4 h-4" />,    label: "Quản lý Tour" },
              { key: "businesses",icon: <Building2 className="w-4 h-4" />, label: "Doanh nghiệp" },
            ] as { key: typeof activeTab; icon: React.ReactNode; label: string }[]
          ).map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium",
                activeTab === key
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {icon}
              {label}
            </button>
          ))}
        </nav>

        {/* Panel content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* ─ POI panel ─ */}
          {activeTab === "pois" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  POIs ({filteredPois.length})
                </h3>
                <button
                  onClick={() => openPoiCreate(10.762, 106.704)}
                  className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Thêm POI"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="🔍 Tìm POI..."
                value={poiSearchText}
                onChange={(e) => setPoiSearchText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              />
              {loadingPois ? (
                <LoadingSpinner />
              ) : (
                filteredPois.map((poi) => (
                  <div
                    key={poi.id}
                    onClick={() => {
                      setSelectedPoi(poi);
                      mapRef.current?.flyTo([poi.lat, poi.lng], 18, { duration: 0.8 });
                    }}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all group",
                      selectedPoi?.id === poi.id
                        ? "bg-emerald-50 border-emerald-300"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{poi.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                          {poi.range_m ? ` · ${poi.range_m}m` : ""}
                        </p>
                        {poi.owner_type === "business" && (
                          <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                            Doanh nghiệp
                          </span>
                        )}
                        <ImageGrid images={poi.images} />
                      </div>
                      {poi.owner_type === "admin" && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => { e.stopPropagation(); openPoiEdit(poi); }}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeletePoi(poi); }}
                            className="p-1.5 text-slate-500 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                      {poi.owner_type === "business" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeletePoi(poi); }}
                          className="p-1.5 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          title="Xóa POI doanh nghiệp"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─ Tour panel ─ */}
          {activeTab === "tours" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">
                  Tours ({filteredTours.length})
                </h3>
                <button
                  onClick={openTourCreate}
                  className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="🔍 Tìm Tour..."
                value={tourSearchText}
                onChange={(e) => setTourSearchText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              />
              {loadingTours ? (
                <LoadingSpinner />
              ) : (
                filteredTours.map((tour) => (
                  <div
                    key={tour.id}
                    onClick={() =>
                      setSelectedTourId(selectedTourId === tour.id ? null : tour.id!)
                    }
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer transition-all group",
                      selectedTourId === tour.id
                        ? "bg-emerald-50 border-emerald-300"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <ImageGrid images={tour.images} />
                    <div className="flex items-start justify-between mt-1">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{tour.name}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {tour.pois?.length || 0} POIs
                        </p>
                        {/* POI order display */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(tour.pois || []).map((tp) => (
                            <span
                              key={tp.poi_id}
                              className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600"
                            >
                              {tp.position}. {tp.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all ml-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); openTourEdit(tour); }}
                          className="p-1.5 text-slate-500 hover:text-emerald-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTour(tour.id!); }}
                          className="p-1.5 text-slate-500 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ─ Business panel ─ */}
          {activeTab === "businesses" && (
            <AdminBusinessesSection authToken={authToken} />
          )}

          {/* ─ Dashboard panel is shown in main area ─ */}
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => {
              localStorage.removeItem("adminToken");
              localStorage.removeItem("adminUser");
              setIsLoggedIn(false);
              setAuthToken(null);
            }}
            className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main Area ───────────────────────────────────────────────────────── */}
      <main className="flex-1 relative h-full overflow-hidden">
        {/* Dashboard stats */}
        {activeTab === "dashboard" && (
          <div className="h-full overflow-y-auto p-8 bg-slate-50">
            <h1 className="text-2xl font-bold mb-6">📊 Dashboard</h1>
            {statsLoading ? (
              <LoadingSpinner />
            ) : stats ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "👤 Tổng người dùng",       value: stats.total_users },
                  { label: "🏢 Tổng doanh nghiệp",     value: stats.total_businesses },
                  { label: "📍 Tổng POI",              value: stats.total_pois },
                  { label: "📍 POI của Admin",          value: stats.pois_by_admin },
                  { label: "📍 POI doanh nghiệp",      value: stats.pois_by_business },
                  { label: "🗺️ Tổng Tour",              value: stats.total_tours },
                  { label: "🗺️ Tour của Admin",         value: stats.tours_by_admin },
                  { label: "🗺️ Tour của Người dùng",   value: stats.tours_by_user },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
                  >
                    <p className="text-slate-500 text-sm mb-1">{label}</p>
                    <p className="text-3xl font-bold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">Không có dữ liệu</p>
            )}
          </div>
        )}

        {/* Map */}
        {showMap && (
          <MapContainer
            center={[10.7615, 106.7046]}
            zoom={14}
            className="h-full w-full z-0"
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <MapEvents />

            {pois
              .filter((poi) => {
                if (activeTab === "tours" && selectedTourId !== null) {
                  return (selectedTour?.poi_ids || []).includes(poi.id!);
                }
                return true;
              })
              .map((poi) => {
                const inTour = selectedTour?.pois?.find((tp) => tp.poi_id === poi.id);
                return (
                  <React.Fragment key={poi.id}>
                    <Marker
                      position={[poi.lat, poi.lng]}
                      icon={getMarkerIcon(
                        selectedPoi?.id === poi.id,
                        inTour?.position
                      )}
                      eventHandlers={{
                        click: () => setSelectedPoi(poi),
                      }}
                    />
                    {poi.range_m > 0 && (
                      <Circle
                        center={[poi.lat, poi.lng]}
                        radius={poi.range_m}
                        pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.05, weight: 1, dashArray: "4" }}
                      />
                    )}
                  </React.Fragment>
                );
              })}

            {newPoiPos && (
              <Marker
                position={newPoiPos}
                icon={getMarkerIcon(true)}
              />
            )}
          </MapContainer>
        )}

        {/* Business tab — no map, show placeholder */}
        {activeTab === "businesses" && (
          <div className="h-full flex items-center justify-center text-slate-400">
            <Building2 className="w-8 h-8 mr-2" />
            <span>Xem danh sách doanh nghiệp trong sidebar</span>
          </div>
        )}

        {/* ── POI Info Modal (read-only view / multi-language) ─────────────────────────────── */}
        <AnimatePresence>
          {selectedPoi && !isEditingPoi && (
            <POIDetailModal
              poi={selectedPoi}
              token={authToken}
              onClose={() => setSelectedPoi(null)}
              onEdit={selectedPoi.owner_type === "admin" ? () => openPoiEdit(selectedPoi) : undefined}
              onDelete={() => handleDeletePoi(selectedPoi)}
            />
          )}
        </AnimatePresence>

        {/* ── POI Form Panel ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isEditingPoi && (
            <motion.div
              key="poi-form"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="absolute top-4 right-4 w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-[1000] max-h-[95vh] overflow-y-auto"
            >
              <form onSubmit={handleSavePoi} className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{poiForm.id ? "Sửa POI" : "Thêm POI mới"}</h3>
                  <button
                    type="button"
                    onClick={() => { setIsEditingPoi(false); setNewPoiPos(null); setSelectedPoi(null); }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Tên POI *</span>
                  <input
                    type="text"
                    maxLength={255}
                    required
                    value={poiForm.name || ""}
                    onChange={(e) => setPoiForm({ ...poiForm, name: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Mô tả *</span>
                  <textarea
                    required
                    rows={3}
                    value={poiForm.description || ""}
                    onChange={(e) => setPoiForm({ ...poiForm, description: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400 resize-none"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Vĩ độ (Lat) *</span>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={poiForm.lat || ""}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setPoiForm({ ...poiForm, lat: v });
                        if (newPoiPos) setNewPoiPos([v, newPoiPos[1]]);
                      }}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Kinh độ (Lng) *</span>
                    <input
                      type="number"
                      step="0.000001"
                      required
                      value={poiForm.lng || ""}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setPoiForm({ ...poiForm, lng: v });
                        if (newPoiPos) setNewPoiPos([newPoiPos[0], v]);
                      }}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold text-slate-600">Phạm vi Range (mét)</span>
                  <input
                    type="number"
                    min={0}
                    value={poiForm.range_m ?? 0}
                    onChange={(e) => setPoiForm({ ...poiForm, range_m: parseInt(e.target.value) || 0 })}
                    className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                  />
                </label>

                <div>
                  <span className="text-xs font-semibold text-slate-600">Ảnh (tối đa 5)</span>
                  <div className="mt-1">
                    <MultiImageUploader
                      existingImages={poiForm.id ? (poiForm.images || []).filter((img) => !poiDeleteImageIds.includes(img.id)) : []}
                      pendingFiles={poiNewImages}
                      onAddFiles={(files) => setPoiNewImages((p) => [...p, ...files])}
                      onDeleteExisting={(id) => setPoiDeleteImageIds((p) => [...p, id])}
                      onRemovePending={(idx) => setPoiNewImages((p) => p.filter((_, i) => i !== idx))}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={operationLoading}
                    className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                  >
                    {operationLoading ? "Đang lưu..." : poiForm.id ? "Cập nhật" : "Tạo POI"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsEditingPoi(false); setNewPoiPos(null); setSelectedPoi(null); }}
                    className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl text-sm hover:bg-slate-200 transition-colors"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Tour Form Modal ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {showTourModal && (
            <motion.div
              key="tour-modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              >
                <form onSubmit={handleSaveTour} className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg">
                      {isEditingTour ? "Sửa Tour" : "Thêm Tour mới"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => { setShowTourModal(false); setIsCreatingTour(false); setIsEditingTour(false); }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Tên Tour *</span>
                    <input
                      type="text"
                      maxLength={255}
                      required
                      value={tourForm.name || ""}
                      onChange={(e) => setTourForm({ ...tourForm, name: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Mô tả</span>
                    <textarea
                      rows={2}
                      value={tourForm.description || ""}
                      onChange={(e) => setTourForm({ ...tourForm, description: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400 resize-none"
                    />
                  </label>

                  <div>
                    <span className="text-xs font-semibold text-slate-600">Ảnh (tối đa 5)</span>
                    <div className="mt-1">
                      <MultiImageUploader
                        existingImages={
                          isEditingTour
                            ? (tours.find((t) => t.id === editingTourId)?.images || []).filter(
                                (img) => !tourDeleteImageIds.includes(img.id)
                              )
                            : []
                        }
                        pendingFiles={tourNewImages}
                        onAddFiles={(files) => setTourNewImages((p) => [...p, ...files])}
                        onDeleteExisting={(id) => setTourDeleteImageIds((p) => [...p, id])}
                        onRemovePending={(idx) => setTourNewImages((p) => p.filter((_, i) => i !== idx))}
                      />
                    </div>
                  </div>

                  {/* POI Picker */}
                  <div>
                    <span className="text-xs font-semibold text-slate-600">
                      Chọn POIs * ({(tourForm.poi_ids || []).length} đã chọn)
                    </span>
                    <input
                      type="text"
                      placeholder="🔍 Lọc POI..."
                      value={tourPoiSearchText}
                      onChange={(e) => setTourPoiSearchText(e.target.value)}
                      className="mt-1 mb-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2">
                      {pois
                        .filter((p) =>
                          p.name.toLowerCase().includes(tourPoiSearchText.toLowerCase())
                        )
                        .map((poi) => {
                          const pos = (tourForm.poi_ids || []).indexOf(poi.id!) + 1;
                          const selected = pos > 0;
                          return (
                            <div
                              key={poi.id}
                              onClick={() => togglePoiInTour(poi.id!)}
                              className={cn(
                                "flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors",
                                selected
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "hover:bg-slate-50 text-slate-700"
                              )}
                            >
                              {selected ? (
                                <span className="w-5 h-5 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                  {pos}
                                </span>
                              ) : (
                                <span className="w-5 h-5 border border-slate-300 rounded-full" />
                              )}
                              <span className="flex-1">{poi.name}</span>
                              <span className="text-xs text-slate-400">
                                {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                    {/* Preview */}
                    {(tourForm.poi_ids || []).length > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        {(tourForm.poi_ids || [])
                          .map((id, i) => `${i + 1}. ${pois.find((p) => p.id === id)?.name || "?"}`)
                          .join(" → ")}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={operationLoading}
                      className="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                    >
                      {operationLoading ? "Đang lưu..." : isEditingTour ? "Cập nhật" : "Tạo Tour"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowTourModal(false); setIsCreatingTour(false); setIsEditingTour(false); }}
                      className="px-4 py-2 text-slate-600 bg-slate-100 rounded-xl text-sm hover:bg-slate-200 transition-colors"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
