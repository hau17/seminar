import { useOutletContext, useNavigate } from "react-router-dom";
import { POIWithDistance } from "../hooks/useUserGPS";
import { Globe, MapPin, Navigation, ChevronRight, PlusCircle } from "lucide-react";
import { useState, useMemo } from "react";
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
}

export function InfoTab() {
  const navigate = useNavigate();
  const { 
    nearbyPOIs, 
    nearbyTours, 
    setHighlightedTour, 
    setMapFocusPoi,
    refreshData
  } = useOutletContext<GlobalContext>();
  
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
  const lang = localStorage.getItem("user_lang") || "vi";

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
            <p className="text-sm text-gray-500">Ngôn ngữ hiện tại</p>
            <p className="font-semibold text-gray-900">{lang.toUpperCase()}</p>
          </div>
        </div>
        <button className="text-blue-600 font-medium text-sm px-3 py-1 rounded-lg bg-blue-50 active:bg-blue-100 transition-colors">Thay đổi</button>
      </div>

      {/* Section 2: Tour đề xuất */}
      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        <Navigation size={20} className="text-green-500" /> Tour gần bạn (Đề xuất)
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
                  alt={tour.name}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-300">
                  <Navigation size={48} />
                </div>
              )}
              <div className="p-3 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-gray-800">{tour.name}</h3>
                  <p className="text-xs text-gray-500">{tour.poi_ids?.length || 0} điểm tham quan</p>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>
          );
        })}
        {suggestedTours.length === 0 && (
          <div className="p-4 bg-white/50 rounded-xl border border-dashed border-gray-300 text-center">
            <p className="text-sm text-gray-400">Không có tour đề xuất nào gần đây.</p>
          </div>
        )}
      </div>

      {/* Section 3: POI gần đây */}
      {/* ... (Existing POI rendering remains unchanged) ... */}
      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        <MapPin size={20} className="text-red-500" /> Điểm tham quan gần bạn
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
                <h3 className="font-bold text-gray-800 text-sm truncate">{poi.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{poi.description}</p>
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
              <p className="text-sm text-gray-500 italic">Đang tìm địa điểm quanh đây...</p>
           </div>
        )}
      </div>

      {/* Section 4: Tour của bạn */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
           <PlusCircle size={20} className="text-blue-500" /> Tour của tôi
        </h2>
        <button 
          onClick={handleOpenCreate}
          className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full uppercase tracking-widest active:scale-95 transition-all"
        >
          + Thêm Tour
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
                <h3 className="font-bold text-gray-800 text-sm truncate">{tour.name}</h3>
                <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{tour.poi_ids?.length || 0} điểm dừng</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </div>
          );
        })}
        {myTours.length === 0 && (
          <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 text-center flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-3 font-medium italic">Bạn chưa có tour nào.</p>
            <button 
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-sm active:scale-95 transition-transform"
            >
              Tạo tour ngay!
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
