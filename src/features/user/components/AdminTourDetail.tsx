import { Tour } from "../../../types";
import { X, Map, Navigation, ChevronRight, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { POIWithDistance } from "../hooks/useUserGPS";
import { useState } from "react";
import { UserPoiModal } from "./UserPoiModal";

interface AdminTourDetailProps {
  tour: Tour;
  onClose: () => void;
  setHighlightedTour: (tour: Tour | null) => void;
  setMapFocusPoi: (poi: any) => void;
  nearbyPOIs: POIWithDistance[];
}

export function AdminTourDetail({ tour, onClose, setHighlightedTour, setMapFocusPoi, nearbyPOIs }: AdminTourDetailProps) {
  const navigate = useNavigate();
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<POIWithDistance | null>(null);

  const lang = localStorage.getItem("user_lang") || "vi";

  const handleViewOnMap = () => {
    setHighlightedTour(tour);
    navigate("/user/map");
    onClose();
  };

  const handlePoiClick = (poiId: number) => {
    const poi = nearbyPOIs.find(p => p.id === poiId);
    if (poi) {
      // Mở Modal tại chỗ, KHÔNG nhảy sang Map
      setSelectedPoi(poi);
    }
  };

  // Hierarchical Thumbnail logic for header (Tour Image > First POI Image > Placeholder)
  const tourImage = tour.images?.[0]?.file_path;
  const poiImage = (tour as any).pois?.[0]?.images?.[0]?.file_path;
  // Translations (Ưu tiên các field đã được Backend làm phẳng)
  const translatedName = tour.translated_name 
    || tour.translations?.find(t => t.language_code.toLowerCase() === lang.toLowerCase())?.translated_name 
    || tour.name;
  const translatedDescription = tour.translated_description
    || tour.translations?.find(t => t.language_code.toLowerCase() === lang.toLowerCase())?.translated_description 
    || tour.description 
    || "Chưa có mô tả cho tour này.";
  const headerThumbnail = tourImage || poiImage;

  return (
    <>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all" onClick={onClose}>
        <div 
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden transform animate-in fade-in zoom-in duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Image/Banner */}
          <div className="relative h-48 shrink-0 bg-gray-200">
            {headerThumbnail ? (
              <img src={headerThumbnail} alt={translatedName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Navigation size={48} />
              </div>
            )}
            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-full shadow-lg hover:bg-white active:scale-90 transition-all">
              <X size={20} className="text-gray-800" />
            </button>
            <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent">
              <h2 className="text-2xl font-bold text-white leading-tight">{translatedName}</h2>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Description Section */}
            <section>
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                <Info size={16} /> Chi tiết hành trình
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                {translatedDescription}
              </p>
            </section>

            {/* Tour Images Gallery */}
            {tour.images && tour.images.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3">Hình ảnh hành trình</h3>
                <div className="flex gap-2 overflow-x-auto pb-2 snap-x no-scrollbar">
                  {tour.images.map((img, idx) => (
                    <div 
                      key={img.id || idx} 
                      className="w-40 h-28 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-gray-100 snap-center active:scale-95 transition-transform cursor-pointer"
                      onClick={() => setFullScreenImage(img.file_path)}
                    >
                      <img src={img.file_path} alt={`${tour.name} ${idx}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* POI List Section */}
            <section>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Lộ trình ({tour.pois?.length || 0} điểm dừng)</h3>
              <div className="space-y-3">
                {tour.pois?.sort((a, b) => a.position - b.position).map((tp) => {
                  // Hiển thị tên đã dịch nếu có, fallback về tp.name
                  const fullPoi = nearbyPOIs.find(p => p.id === tp.poi_id);
                  const displayName = fullPoi?.translations?.find(t => t.language_code === lang)?.translated_name
                    || tp.name;
                  return (
                    <div 
                      key={tp.poi_id}
                      onClick={() => handlePoiClick(tp.poi_id)}
                      className="group flex items-center gap-4 p-3 rounded-2xl border border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50/30 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                    >
                      <div className="w-10 h-10 shrink-0 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-110 transition-transform">
                        {tp.position}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 text-sm truncate">{displayName}</h4>
                        <p className="text-[10px] text-gray-400 font-medium">Nhấn để xem chi tiết</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Action Bar */}
          <div className="p-6 pt-2 bg-white/80 backdrop-blur border-t border-gray-100">
            <button 
              onClick={handleViewOnMap}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-[0_8px_20px_-6px_rgba(37,99,235,0.6)] active:scale-95 hover:bg-blue-700 transition-all"
            >
              <Map size={20} />
              Xem trình diễn trên bản đồ
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Overlay */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[3000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 transition-all animate-in fade-in zoom-in duration-200"
          onClick={() => setFullScreenImage(null)}
        >
           <button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
              <X size={24} />
           </button>
           <img src={fullScreenImage} alt="Full screen preview" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      {/* POI Detail Modal (mở tại chỗ, không nhảy Map) */}
      {selectedPoi && <UserPoiModal poi={selectedPoi} onClose={() => setSelectedPoi(null)} />}
    </>
  );
}
