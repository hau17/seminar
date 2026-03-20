import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
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
import { POI, POIType, Tour } from "../types";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ToastContainer } from "../components/Toast";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { LoginPage } from "../components/LoginPage";
import { AdminBusinessesSection } from "./AdminBusinessesSection";
import { AdminPendingPoisSection } from "./AdminPendingPoisSection";
import { validatePOI, validateTour } from "../utils/validation";
import { usePOIs } from "../hooks/usePOIs";
import { useTours } from "../hooks/useTours";
import { useNavigate } from "react-router-dom";

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

// ✅ FIX #9: FR-POI-001 Color-coded Markers by POI type
const getMarkerIcon = (poiType: POIType, isSelected: boolean) => {
  // Color scheme: MAIN=Blue, others=Orange, Selected=Green
  const colorMap: Record<POIType, string> = {
    [POIType.MAIN]: "#3b82f6", // Blue for main POI
    [POIType.WC]: "#f97316", // Orange for minor POIs
    [POIType.TICKET]: "#f97316",
    [POIType.PARKING]: "#f97316",
    [POIType.PORT]: "#f97316",
  };

  const bgColor = isSelected ? "#22c55e" : colorMap[poiType]; // Green when selected
  const emoji = POI_ICONS[poiType];

  return L.divIcon({
    html: `<div style="
      background-color: ${bgColor};
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      cursor: pointer;
      transition: all 0.2s ease;
    ">
      ${emoji}
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
    className: "custom-marker",
  });
};

export function AdminDashboard() {
  const navigate = useNavigate();
  // Auth state - moved to top level to fix hooks violation
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState("admin@gmail.com");
  const [loginPassword, setLoginPassword] = useState("password");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Dashboard state
  const [activeTab, setActiveTab] = useState<
    "pois" | "tours" | "businesses" | "pending-approval"
  >("tours");
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [isEditingPoi, setIsEditingPoi] = useState(false);
  const [newPoiPos, setNewPoiPos] = useState<[number, number] | null>(null);
  const [isCreatingTour, setIsCreatingTour] = useState(false);
  const [isEditingTour, setIsEditingTour] = useState(false);
  const [editingTourId, setEditingTourId] = useState<number | null>(null);
  const [currentTour, setCurrentTour] = useState<Partial<Tour>>({
    title: "",
    description: "", // ✅ PHASE 2 C7: Tour description field
    poi_ids: [],
    image: "",
  });
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type: "error" | "success" }>
  >([]);
  // ✅ FIX #5: Track loading state for CRUD operations (NFR-LOAD-01)
  const [operationLoading, setOperationLoading] = useState(false);

  // ✅ PHASE 1 C4: POI search state
  const [poiSearchText, setPoiSearchText] = useState("");

  // ✅ PHASE 1 C1, C3: File upload states for POI
  const [poiImageFile, setPoiImageFile] = useState<File | null>(null);
  const [poiImagePreview, setPoiImagePreview] = useState<string>("");
  const [removePoiImage, setRemovePoiImage] = useState(false);

  // ✅ PHASE 1 C5: Map reference for flyTo
  const mapRef = useRef<L.Map | null>(null);

  // ✅ PHASE 2 C7, C16: Tour search + POI search in form
  const [tourSearchText, setTourSearchText] = useState("");
  const [tourPoiSearchText, setTourPoiSearchText] = useState("");

  // ✅ PHASE 2 C6: Tour image file upload state
  const [tourImageFile, setTourImageFile] = useState<File | null>(null);
  const [tourImagePreview, setTourImagePreview] = useState<string>("");
  const [removeTourImage, setRemoveTourImage] = useState(false);

  // ✅ PHASE 2 C8, C18: Track selected tour for map isolation
  const [selectedTourId, setSelectedTourId] = useState<number | null>(null);

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

  // ✅ PHASE 1 C1: Handler for POI image selection
  const handlePoiImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        showToast("Ảnh không được vượt quá 5MB", "error");
        return;
      }
      setPoiImageFile(file);
      setRemovePoiImage(false);

      // Show preview
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPoiImagePreview(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ PHASE 1 C5: Handler for POI click - flyTo + select
  const handlePoiItemClick = (poi: POI) => {
    setSelectedPoi(poi);
    if (mapRef.current) {
      mapRef.current.flyTo([poi.lat, poi.lng], 18, { duration: 1 });
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem("authToken");
    if (savedToken) {
      setAuthToken(savedToken);
      setIsLoggedIn(true);
    }
  }, []);

  // ✅ FIX #1: Auto-fetch POIs/Tours after login (FR-02.1, FR-03.1)
  // ✅ FIX #6: Show error toast when initial fetch fails (NFR-ERR-02)
  useEffect(() => {
    if (isLoggedIn && authToken) {
      fetchPois().catch((err) => {
        console.error("Failed to load POIs:", err);
        showToast("Lỗi tải danh sách POI. Vui lòng cố gắng lại.", "error");
      });
      fetchTours().catch((err) => {
        console.error("Failed to load Tours:", err);
        showToast("Lỗi tải danh sách Tour. Vui lòng cố gắng lại.", "error");
      });
    }
  }, [isLoggedIn, authToken, fetchPois, fetchTours]);

  // ✅ PHASE 2 C7 + FR-03.19: fitBounds to selected tour POIs
  useEffect(() => {
    if (!mapRef.current || selectedTourId === null) return;

    // Find selected tour
    const selectedTour = tours.find((t) => t.id === selectedTourId);
    if (!selectedTour || !selectedTour.pois || selectedTour.pois.length === 0)
      return;

    // ✅ v1.4: Use detailed pois array from selectedTour (already has lat/lng)
    const tourPois = selectedTour.pois;
    if (tourPois.length === 0) return;

    // Build bounding box from tour POI coordinates
    const bounds = L.latLngBounds(tourPois.map((p) => [p.lat, p.lng]));

    // Fit map to bounds with padding
    mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  }, [selectedTourId, tours]);

  // ✅ FIX: Reset selectedTourId when switching away from Tours tab (FR-03.20 + prevent state leak)
  useEffect(() => {
    if (activeTab === "pois") {
      setSelectedTourId(null);
    }
  }, [activeTab]);

  // ✅ FIX: Populate currentTour state with poi_ids when opening Edit Tour panel (FR-03.13)
  useEffect(() => {
    if (isEditingTour && editingTourId !== null) {
      const tourToEdit = tours.find((t) => t.id === editingTourId);
      if (tourToEdit) {
        // ✅ CRITICAL: Extract poi_ids array to populate form correctly
        // poi_ids might come from tour.poi_ids (field) or computed from tour.pois array
        const poiIds =
          tourToEdit.poi_ids ||
          (tourToEdit.pois ? tourToEdit.pois.map((p: any) => p.poi_id) : []);

        setCurrentTour({
          id: tourToEdit.id,
          title: tourToEdit.title,
          description: tourToEdit.description,
          poi_ids: poiIds, // ✅ Explicitly set poi_ids for form
          image: tourToEdit.image,
        });

        // Set tour image preview
        setTourImagePreview(
          tourToEdit.image ? `/uploads/tours/${tourToEdit.image}` : "",
        );
      }
    }
  }, [isEditingTour, editingTourId, tours]);

  const handleSavePoi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoi) return;

    // Validate
    const validationError = validatePOI(selectedPoi);
    if (validationError) {
      showToast(validationError, "error");
      return;
    }

    // ✅ FIX #5: Set loading state for CRUD operation (NFR-LOAD-01)
    setOperationLoading(true);
    try {
      // ✅ PHASE 1 C1, C3: Pass imageFile and removeImage to savePoi
      await savePoi(selectedPoi, poiImageFile, removePoiImage);
      setIsEditingPoi(false);
      setSelectedPoi(null);
      setNewPoiPos(null);
      setPoiImageFile(null);
      setPoiImagePreview("");
      setRemovePoiImage(false);
      showToast(
        selectedPoi.id ? "Cập nhật POI thành công" : "Tạo POI thành công",
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("Lỗi lưu POI", "error");
    } finally {
      // ✅ FIX #5: Clear loading state (NFR-LOAD-01)
      setOperationLoading(false);
    }
  };

  const handleDeletePoi = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa điểm này?")) return;
    // ✅ FIX #5: Set loading state (NFR-LOAD-01)
    setOperationLoading(true);
    try {
      await deletePoi(id);
      setSelectedPoi(null);
      showToast("Xóa POI thành công", "success");
    } catch (error) {
      console.error(error);
      showToast("Lỗi xóa POI", "error");
    } finally {
      setOperationLoading(false);
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

    // ✅ FIX #5: Set loading state (NFR-LOAD-01)
    setOperationLoading(true);
    try {
      // ✅ PHASE 2 C6: Pass imageFile and removeImage to saveTour
      await saveTour(currentTour, tourImageFile, removeTourImage);
      setIsCreatingTour(false);
      setIsEditingTour(false);
      setEditingTourId(null);
      setCurrentTour({ title: "", description: "", poi_ids: [], image: "" });
      setTourImageFile(null);
      setTourImagePreview("");
      setRemoveTourImage(false);
      setTourPoiSearchText("");
      setSelectedTourId(null); // Reset map isolation
      showToast(
        currentTour.id ? "Cập nhật Tour thành công" : "Tạo Tour thành công",
        "success",
      );
    } catch (error) {
      console.error(error);
      showToast("Lỗi lưu Tour", "error");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteTour = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa tour này?")) return;
    // ✅ FIX #5: Set loading state (NFR-LOAD-01)
    setOperationLoading(true);
    try {
      await deleteTour(id);
      showToast("Xóa Tour thành công", "success");
    } catch (error) {
      console.error(error);
      showToast("Lỗi xóa Tour", "error");
    } finally {
      setOperationLoading(false);
    }
  };

  const MapEvents = () => {
    const mapInstance = useMap();
    // ✅ PHASE 1 C5: Store map reference for flyTo
    useEffect(() => {
      mapRef.current = mapInstance;
    }, [mapInstance]);

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
            radius: 0,
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
    <div className="h-full flex bg-slate-50 text-slate-900 overflow-hidden">
      {" "}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-200 flex flex-col bg-white backdrop-blur-xl">
        <div className="p-6 border-bottom border-slate-200">
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
                  : "text-slate-600 hover:bg-slate-100",
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
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              <Layers className="w-5 h-5" />
              <span className="font-medium">Quản lý Tours</span>
            </button>

            {/* ✅ v1.6: Business Management Menu */}
            <div className="space-y-1">
              <button
                onClick={() =>
                  setActiveTab(
                    activeTab === "businesses" ||
                      activeTab === "pending-approval"
                      ? "tours"
                      : "businesses",
                  )
                }
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
                  activeTab === "businesses" || activeTab === "pending-approval"
                    ? "bg-emerald-50 text-emerald-600 border-l-4 border-emerald-500"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <div className="w-5 h-5 text-lg">🏢</div>
                <span>Doanh Nghiệp</span>
              </button>

              {/* Sub-menu: Pending POIs */}
              {(activeTab === "businesses" ||
                activeTab === "pending-approval") && (
                <button
                  onClick={() => setActiveTab("pending-approval")}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 pl-8 rounded-xl transition-all font-medium text-sm",
                    activeTab === "pending-approval"
                      ? "bg-amber-50 text-amber-600"
                      : "text-slate-600 hover:bg-slate-100",
                  )}
                >
                  <span>📋 POIs chờ duyệt</span>
                </button>
              )}
            </div>
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === "pois" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Danh sách POIs
                </h3>
                <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full text-slate-600">
                  {loadingPois
                    ? "..."
                    : pois.filter((p) =>
                        p.name
                          .toLowerCase()
                          .includes(poiSearchText.toLowerCase()),
                      ).length}
                </span>
              </div>

              {/* ✅ PHASE 1 C4: POI Search field */}
              <input
                type="text"
                placeholder="🔍 Tìm kiếm POI..."
                value={poiSearchText}
                onChange={(e) => setPoiSearchText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
              />

              {/* Filter POIs by search text */}
              {pois
                .filter((p) =>
                  p.name.toLowerCase().includes(poiSearchText.toLowerCase()),
                )
                .map((poi) => (
                  <div
                    key={poi.id}
                    onClick={() => handlePoiItemClick(poi)}
                    className={cn(
                      "p-4 rounded-xl border transition-all cursor-pointer group",
                      selectedPoi?.id === poi.id
                        ? "bg-slate-100 border-slate-200"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300",
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 gap-3">
                        <h4 className="font-semibold text-sm">{poi.name}</h4>
                        <p className="text-xs text-slate-700">{poi.type}</p>
                        {poi.radius ? (
                          <p className="text-xs text-slate-700">
                            Radius: {poi.radius}m
                          </p>
                        ) : null}
                        {poi.image && (
                          <img
                            src={`/uploads/pois/${poi.image}`}
                            alt={poi.name}
                            className="mt-2 h-16 w-full object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPoi(poi);
                            setIsEditingPoi(true);
                          }}
                          className="p-2 text-slate-600 hover:text-emerald-500 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePoi(poi.id!);
                          }}
                          className="p-2 text-slate-600 hover:text-red-500 transition-all"
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {activeTab === "tours" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                  Danh sách Tours
                </h3>
                <button
                  onClick={() => {
                    setIsCreatingTour(true);
                    setTourImageFile(null);
                    setTourImagePreview("");
                  }}
                  className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* ✅ PHASE 2 C7, C16: Tour Search field */}
              <input
                type="text"
                placeholder="🔍 Tìm kiếm Tour..."
                value={tourSearchText}
                onChange={(e) => setTourSearchText(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm mx-2"
              />

              {/* Tours list filtered by search */}
              {tours
                .filter((t) =>
                  t.title.toLowerCase().includes(tourSearchText.toLowerCase()),
                )
                .map((tour) => (
                  <div
                    key={tour.id}
                    onClick={() => {
                      const isCurrentlySelected = selectedTourId === tour.id;
                      setSelectedTourId(isCurrentlySelected ? null : tour.id!);
                    }}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer group",
                      selectedTourId === tour.id
                        ? "bg-emerald-50 border-emerald-300"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300",
                    )}
                  >
                    {/* Tour thumbnail */}
                    {tour.image && (
                      <img
                        src={`/uploads/tours/${tour.image}`}
                        alt={tour.title}
                        className="w-full h-20 object-cover rounded-lg mb-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{tour.title}</h4>
                        {/* POI order badges */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(tour.poi_ids || []).map((id, idx) => {
                            const poi = pois.find((p) => p.id === id);
                            return (
                              <span
                                key={idx}
                                className="text-xs bg-slate-100 px-2 py-1 rounded-md text-slate-600"
                              >
                                {idx + 1}. {poi?.name || "Unknown"}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTourId(tour.id!);
                            setIsEditingTour(true);
                            setCurrentTour({ ...tour });
                            setTourImageFile(null);
                            setTourImagePreview(
                              tour.image ? `/uploads/tours/${tour.image}` : "",
                            );
                          }}
                          className="p-2 text-slate-600 hover:text-emerald-500 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTour(tour.id!);
                          }}
                          className="p-2 text-slate-600 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* ✅ v1.6: Admin Business Management Section */}
          {activeTab === "businesses" && (
            <AdminBusinessesSection authToken={authToken} />
          )}

          {/* ✅ v1.6: Admin Pending POI Approval Section */}
          {activeTab === "pending-approval" && (
            <AdminPendingPoisSection authToken={authToken} />
          )}
        </div>

        <div className="p-6 border-t border-slate-200">
          <button
            onClick={() => {
              localStorage.removeItem("authToken");
              setIsLoggedIn(false);
              setAuthToken(null);
            }}
            className="w-full flex items-center justify-center gap-2 text-slate-600 hover:text-slate-900 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất
          </button>
        </div>
      </aside>
      {/* Main Content (Map) - Truncated for brevity, same as before */}
      <main className="flex-1 relative h-full">
        <MapContainer
          center={[10.7615, 106.7046]}
          zoom={16}
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
                const selectedTour = tours.find((t) => t.id === selectedTourId);
                return (selectedTour?.poi_ids || []).includes(poi.id!);
              }
              return true;
            })
            .map((poi) => (
              <Marker
                key={poi.id}
                position={[poi.lat, poi.lng]}
                icon={getMarkerIcon(poi.type, selectedPoi?.id === poi.id)}
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
                    <p className="text-xs text-slate-700">{poi.type}</p>
                    {poi.description && (
                      <p className="text-xs mt-2 text-slate-700">
                        {poi.description}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

          {newPoiPos && <Marker position={newPoiPos} />}

          {activeTab === "tours" &&
            tours
              .filter((tour) => {
                if (selectedTourId !== null) {
                  return tour.id === selectedTourId;
                }
                return true;
              })
              .map((tour) => {
                const positions = (tour.pois || []).map(
                  (p) => [p.lat, p.lng] as [number, number],
                );

                return (
                  <Polyline
                    key={tour.id}
                    positions={positions}
                    color={selectedTourId === tour.id ? "#10b981" : "#94a3b8"}
                    weight={selectedTourId === tour.id ? 5 : 3}
                    opacity={selectedTourId === tour.id ? 1.0 : 0.4}
                    dashArray={selectedTourId === tour.id ? "" : "10, 10"}
                  />
                );
              })}

          {activeTab === "tours" &&
            selectedTourId !== null &&
            (() => {
              const selectedTour = tours.find((t) => t.id === selectedTourId);
              if (
                !selectedTour ||
                !selectedTour.pois ||
                selectedTour.pois.length === 0
              ) {
                return null;
              }

              const getOrderedMarkerIcon = (position: number) => {
                return L.divIcon({
                  html: `<div style="
                    background-color: #10b981;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    font-weight: bold;
                    color: white;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                    cursor: pointer;
                    transition: all 0.2s ease;
                  ">
                    ${position}
                  </div>`,
                  iconSize: [40, 40],
                  iconAnchor: [20, 40],
                  popupAnchor: [0, -40],
                  className: "tour-marker",
                });
              };

              return selectedTour.pois.map((poiData, idx) => (
                <Marker
                  key={`tour-${selectedTourId}-poi-${poiData.poi_id}`}
                  position={[poiData.lat, poiData.lng]}
                  icon={getOrderedMarkerIcon(poiData.position)}
                  eventHandlers={{
                    click: () => {
                      const mainPoi = pois.find((p) => p.id === poiData.poi_id);
                      if (mainPoi) {
                        setSelectedPoi(mainPoi);
                        setIsEditingPoi(false);
                      }
                    },
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-zinc-900">
                        {poiData.name}
                      </h3>
                      <p className="text-xs text-slate-700">{poiData.type}</p>
                      <p className="text-xs text-emerald-600 font-semibold mt-1">
                        Vị trí #{poiData.position}
                      </p>
                      {poiData.description && (
                        <p className="text-xs mt-2 text-slate-700">
                          {poiData.description}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ));
            })()}
        </MapContainer>

        {/* Overlays - truncated for length */}
        <AnimatePresence>
          {isEditingPoi && selectedPoi && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="absolute top-0 right-0 h-full w-96 bg-white/95 backdrop-blur-xl border-l border-slate-200 z-10 p-8 shadow-2xl overflow-y-auto"
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
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePoi} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                    Tên điểm
                  </label>
                  <input
                    required
                    value={selectedPoi.name}
                    onChange={(e) =>
                      setSelectedPoi({ ...selectedPoi, name: e.target.value })
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                    placeholder="Nhập tên điểm tham quan..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
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
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                  >
                    {Object.values(POIType).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
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
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 h-32 focus:outline-none focus:border-emerald-500"
                    placeholder="Mô tả chi tiết về địa điểm này..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                    Bán kính (mét)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={selectedPoi.radius || 0}
                    onChange={(e) =>
                      setSelectedPoi({
                        ...selectedPoi,
                        radius: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-2">
                    Hình ảnh (max 5MB)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePoiImageSelect}
                    disabled={operationLoading}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-emerald-500 text-sm"
                  />

                  {(poiImagePreview ||
                    (selectedPoi?.image && !removePoiImage)) && (
                    <div className="mt-3 relative h-32 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                      <img
                        src={
                          poiImagePreview ||
                          `/uploads/pois/${selectedPoi?.image}`
                        }
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPoiImageFile(null);
                          setPoiImagePreview("");
                          if (selectedPoi?.image && selectedPoi.id) {
                            setRemovePoiImage(true);
                          }
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Vĩ độ (Lat)
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      min="-90"
                      max="90"
                      value={selectedPoi.lat.toFixed(6)}
                      onChange={(e) =>
                        setSelectedPoi({
                          ...selectedPoi,
                          lat: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-700 uppercase mb-1">
                      Kinh độ (Lng)
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      min="-180"
                      max="180"
                      value={selectedPoi.lng.toFixed(6)}
                      onChange={(e) =>
                        setSelectedPoi({
                          ...selectedPoi,
                          lng: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={operationLoading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-slate-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  {operationLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner />
                      Đang lưu...
                    </div>
                  ) : (
                    "Lưu địa điểm"
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-8 left-8 z-10 bg-white/80 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-xl">
          <h5 className="text-[10px] font-bold text-slate-700 uppercase tracking-widest mb-3">
            Chú thích
          </h5>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {Object.entries(POI_ICONS).map(([type, icon]) => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-sm">{icon}</span>
                <span className="text-[10px] text-slate-600">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
