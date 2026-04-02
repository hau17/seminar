import { useOutletContext, useNavigate } from "react-router-dom";
import { POIWithDistance } from "../hooks/useUserGPS";
import { Globe, MapPin, Navigation, ChevronRight, PlusCircle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { apiService } from "../../../services/api";
import { UserPoiModal } from "../components/UserPoiModal";
import { AdminTourDetail } from "../components/AdminTourDetail";
import { UserTourDetail } from "../components/UserTourDetail";
import { UserTourFormModal } from "../components/UserTourFormModal";
import { Tour, POI } from "../../../types";

interface GlobalContext {
  userLocation: { lat: number; lng: number } | null;
  nearbyPOIs: POIWithDistance[];
  nearbyTours: Tour[];
  currentAudioPoi: POIWithDistance | null;
  isPlaying: boolean;
  highlightedTour: Tour | null;
  setHighlightedTour: (tour: Tour | null) => void;
  mapFocusPoi: any;
  setMapFocusPoi: (poi: any) => void;
  refreshData: () => void;
  changeLanguage: (code: string) => Promise<void>;
}

export function InfoTab() {
  const navigate = useNavigate();
  const { 
    nearbyPOIs,
    nearbyTours,
    setHighlightedTour,
    setMapFocusPoi,
    refreshData,
    changeLanguage
  } = useOutletContext<GlobalContext>();
  
  const { t, i18n } = useTranslation();
  const [languages, setLanguages] = useState<{code: string, name: string}[]>([]);
  
  useEffect(() => {
    const fetchLangs = async () => {
      try {
        const res = await apiService.get("/api/languages");
        if (res.ok) {
          setLanguages(await res.json());
        }
      } catch (e) {
        console.error("Fetch languages failed", e);
      }
    };
    fetchLangs();
  }, []);
  const [selectedPoi, setSelectedPoi] = useState<POIWithDistance | null>(null);
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);

  // CRUD States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editTour, setEditTour] = useState<Tour | null>(null);

  const handleOpenCreate = () => {
    setEditTour(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (tour: Tour) => {
    setEditTour(tour);
    setIsFormOpen(true);
  };
  const lang = i18n.language || localStorage.getItem("user_lang") || "vi";

  // Helper: lấy tên POI theo ngôn ngữ hiện tại
  const getPoiName = (poi: any): string => {
    if (lang === "vi") return poi.name;
    // Ưu tiên dùng field đã được flatten từ API
    if (poi.translated_name) return poi.translated_name;
    const t = poi.translations?.find((t: any) => t.language_code === lang);
    return t?.translated_name || poi.name;
  };

  // Helper: lấy mô tả POI theo ngôn ngữ hiện tại  
  const getPoiDescription = (poi: any): string => {
    if (lang === "vi") return poi.description;
    if (poi.translated_description) return poi.translated_description;
    const t = poi.translations?.find((t: any) => t.language_code === lang);
    return t?.translated_description || poi.description;
  };

  // Helper: lấy tên Tour theo ngôn ngữ hiện tại
  const getTourName = (tour: Tour): string => {
    if (lang === "vi") return tour.name;
    if (tour.translated_name) return tour.translated_name;
    const t = tour.translations?.find(t => t.language_code === lang);
    return t?.translated_name || tour.name;
  };

  // Helper: lấy mô tả Tour theo ngôn ngữ hiện tại
  const getTourDescription = (tour: Tour): string => {
    if (lang === "vi") return tour.description || "";
    if (tour.translated_description) return tour.translated_description;
    const t = tour.translations?.find(t => t.language_code === lang);
    return t?.translated_description || tour.description || "";
  };

  // Section 2: Tour đề xuất (Tours by Admin within 20km)
  const suggestedTours = useMemo(() => 
    nearbyTours.filter(t => t.created_by_type === "admin"), 
  [nearbyTours]);

  // Section 4: Tour của bạn (Tours by User)
  const myTours = useMemo(() => 
    nearbyTours.filter(t => t.created_by_type === "user"), 
  [nearbyTours]);

  // Section 2: Tour đề xuất
  return (
    <div className="h-full overflow-y-auto bg-gray-50 flex flex-col relative z-10 pb-32 px-4 pt-4">
      {/* Section 1: Lựa chọn ngôn ngữ */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex items-center justify-between shrink-0 border border-gray-100">
        <div className="flex items-center gap-3">
          <Globe className="text-blue-500" />
          <div>
            <p className="text-sm text-gray-500">{t("info.current_lang")}</p>
            <p className="font-semibold text-gray-900">
              {languages.find(l => l.code === lang)?.name || lang.toUpperCase()}
            </p>
          </div>
        </div>
        <div className="relative">
          <select 
            value={lang}
            onChange={(e) => changeLanguage(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
          >
            {languages.map(l => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
          <button className="text-blue-600 font-medium text-sm px-3 py-1 rounded-lg bg-blue-50 active:bg-blue-100 transition-colors pointer-events-none">
            {t("info.change")}
          </button>
        </div>
      </div>

      {/* Section 2: Tour đề xuất */}
      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        <Navigation size={20} className="text-green-500" /> {t("info.suggested_tours")}
      </h2>
      <div className="space-y-4 mb-8">
        {suggestedTours.map((tour) => {
          // Fallback logic for Tour Thumbnail
          const tourImage = tour.images?.[0]?.file_path;
          const poiImage = (tour as any).pois?.[0]?.images?.[0]?.file_path;
          const thumbnail = tourImage || poiImage;
          
          return (
            <div 
              key={tour.id} 
              onClick={() => setSelectedTour(tour)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col cursor-pointer hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              {thumbnail ? (
                <img 
                  src={thumbnail} 
                  alt={getTourName(tour)}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-300">
                  <Navigation size={48} />
                </div>
              )}
              <div className="p-3 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">{getTourName(tour)}</h3>
                  <p className="text-xs text-gray-500">{tour.poi_ids?.length || 0} {t("info.attractions")}</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>
          );
        })}
        {suggestedTours.length === 0 && (
          <div className="p-4 bg-white/50 rounded-xl border border-dashed border-gray-300 text-center">
            <p className="text-sm text-gray-400">{t("info.no_suggested_tours")}</p>
          </div>
        )}
      </div>

      {/* Section 3: POI gần đây */}
      {/* ... (Existing POI rendering remains unchanged) ... */}
      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        <MapPin size={20} className="text-red-500" /> {t("info.nearby_pois")}
      </h2>
      <div className="space-y-3 mb-8">
        {nearbyPOIs.slice(0, 5).map((poi) => {
          const thumbnail = poi.images && poi.images.length > 0 ? poi.images[0].file_path : null;
          
          return (
            <div
              key={poi.id}
              onClick={() => setSelectedPoi(poi)}
              className="p-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex gap-3 cursor-pointer items-center active:bg-gray-50 transition-colors"
            >
              {/* Thumbnail Container with flex-shrink-0 */}
              <div className="w-16 h-16 shrink-0 bg-gray-100 rounded-xl overflow-hidden border border-gray-50 flex-shrink-0">
                {(() => {
                  const rawPath = poi.images?.[0]?.file_path;
                  const thumbnail = rawPath 
                    ? (rawPath.startsWith("/uploads") ? rawPath : `/uploads/pois/${rawPath}`) 
                    : null;
                  
                  return thumbnail ? (
                    <img src={thumbnail} alt={poi.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <MapPin size={24} />
                    </div>
                  );
                })()}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-bold text-gray-800 text-sm truncate">{getPoiName(poi)}</h3>
                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{getPoiDescription(poi)}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {Math.round(poi.distance)}m
                   </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0" />
            </div>
          );
        })}
        {nearbyPOIs.length === 0 && (
           <div className="p-10 flex flex-col items-center justify-center opacity-40">
              <MapPin size={48} className="text-gray-300 animate-bounce mb-2" />
              <p className="text-sm text-gray-500 italic">{t("info.finding_pois")}</p>
           </div>
        )}
      </div>

      {/* Section 4: Tour của bạn */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
           <PlusCircle size={20} className="text-blue-500" /> {t("info.my_tours")}
        </h2>
        <button 
          onClick={handleOpenCreate}
          className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest active:scale-95 transition-all"
        >
          {t("info.add_tour")}
        </button>
      </div>
      
      <div className="space-y-3">
        {myTours.map((tour) => {
          const tourImage = tour.images?.[0]?.file_path;
          const poiImage = (tour as any).pois?.[0]?.images?.[0]?.file_path;
          const thumbnail = tourImage || poiImage;

          return (
            <div 
              key={tour.id} 
              onClick={() => setSelectedTour(tour)}
              className="p-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex gap-3 cursor-pointer items-center active:bg-gray-50 transition-colors"
            >
              <div className="w-16 h-16 shrink-0 bg-gray-100 rounded-xl overflow-hidden border border-gray-50">
                {thumbnail ? (
                  <img src={thumbnail} alt={tour.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Navigation size={24} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="font-bold text-gray-800 text-sm truncate">{getTourName(tour)}</h3>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{tour.poi_ids?.length || 0} {t("info.stops")}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </div>
          );
        })}
        {myTours.length === 0 && (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-3 font-medium italic">{t("info.no_user_tours")}</p>
            <button 
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-transform"
            >
              {t("info.create_tour_now")}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedTour && selectedTour.created_by_type === "admin" && (
        <AdminTourDetail 
          tour={selectedTour} 
          onClose={() => setSelectedTour(null)} 
          setHighlightedTour={setHighlightedTour}
          setMapFocusPoi={setMapFocusPoi}
          nearbyPOIs={nearbyPOIs}
        />
      )}
      
      {selectedTour && selectedTour.created_by_type === "user" && (
        <UserTourDetail 
          tour={selectedTour} 
          onClose={() => setSelectedTour(null)} 
          setHighlightedTour={setHighlightedTour}
          setMapFocusPoi={setMapFocusPoi}
          nearbyPOIs={nearbyPOIs}
          refreshData={refreshData}
          onEdit={handleOpenEdit}
        />
      )}

      {selectedPoi && <UserPoiModal poi={selectedPoi} onClose={() => setSelectedPoi(null)} />}

      <UserTourFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editTour}
        allPois={nearbyPOIs as any}
        onSuccess={refreshData}
      />
    </div>
  );
}
