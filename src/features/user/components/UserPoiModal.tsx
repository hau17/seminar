import { useState, useEffect, useRef } from "react";
import { POIWithDistance } from "../hooks/useUserGPS";
import { apiService } from "../../../services/api";
import { X, Play, Pause, Download, Loader2 } from "lucide-react";
import { useOutletContext } from "react-router-dom";

interface GlobalContext {
  playAudio: (poi: POIWithDistance) => void;
  pauseAudio: () => void;
  currentAudioPoi: POIWithDistance | null;
  isPlaying: boolean;
}

export function UserPoiModal({ poi, onClose }: { poi: POIWithDistance; onClose: () => void }) {
  const { playAudio, pauseAudio, currentAudioPoi, isPlaying } = useOutletContext<GlobalContext>();
  const [translatedText, setTranslatedText] = useState(poi.description);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const isGeneratingAudio = useRef(false);
  
  const lang = localStorage.getItem("user_lang") || "vi";
  const isCurrentlyPlaying = isPlaying && currentAudioPoi?.id === poi.id;

  useEffect(() => {
    if (isGeneratingAudio.current) return;
    isGeneratingAudio.current = true;

    async function checkAudio() {
      if (lang === "vi") {
        isGeneratingAudio.current = false;
        return;
      } 
      try {
        setLoading(true);
        const res = await apiService.post("/api/audio/generate", {
          poi_id: poi.id,
          language_code: lang
        });
        const details = await res.json();
        if (details.translated_description) setTranslatedText(details.translated_description);
        if (details.file_path) setAudioUrl(details.file_path);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        isGeneratingAudio.current = false;
      }
    }
    checkAudio();
  }, [poi.id, lang]);

  return (
    <>
      <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto transition-all" onClick={onClose}>
        <div 
          className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh] transform transition-all border border-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-gray-100/80 backdrop-blur rounded-full hover:bg-gray-200 transition-colors">
             <X size={20} className="text-gray-600" />
          </button>

          <header className="mb-4">
            <h2 className="text-2xl font-black text-gray-900 pr-10 leading-tight">{poi.name}</h2>
            <div className="mt-2 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-100">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Cách bạn {Math.round(poi.distance)}m
            </div>
          </header>

          {/* Image Gallery */}
          {poi.images && poi.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide no-scrollbar">
              {poi.images.map((img, idx) => {
                const rawPath = img.file_path;
                const fullPath = rawPath 
                  ? (rawPath.startsWith("/uploads") ? rawPath : `/uploads/pois/${rawPath}`) 
                  : "";
                
                return (
                  <div 
                    key={img.id || idx} 
                    className="w-48 h-32 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-gray-100 snap-center active:scale-95 transition-transform cursor-pointer"
                    onClick={() => setFullScreenImage(fullPath)}
                  >
                    <img src={fullPath} alt={`${poi.name} ${idx}`} className="w-full h-full object-cover" />
                  </div>
                );
              })}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
               <Loader2 className="animate-spin text-blue-500" size={40} />
               <p className="text-sm font-medium text-gray-400">Đang tối ưu nội dung...</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto min-h-[100px] py-4 text-gray-600 text-sm leading-relaxed border-t border-gray-50 mb-6 font-medium">
                {translatedText}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => isCurrentlyPlaying ? pauseAudio() : playAudio(poi)}
                  className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 ${
                    isCurrentlyPlaying ? "bg-red-500 text-white shadow-red-200" : "bg-blue-600 text-white shadow-blue-200"
                  }`}
                >
                  {isCurrentlyPlaying ? (
                    <><Pause size={20} fill="currentColor" /> Tạm dừng</>
                  ) : (
                    <><Play size={20} fill="currentColor" /> Nghe thuyết minh</>
                  )}
                </button>

                <button className="flex items-center justify-center w-14 h-14 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 active:bg-gray-200 transition-all border border-gray-100">
                  <Download size={22} />
                </button>
              </div>
            </>
          )}
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
    </>
  );
}
