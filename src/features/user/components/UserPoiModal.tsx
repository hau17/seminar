import { useState, useEffect } from "react";
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
  
  const lang = localStorage.getItem("user_lang") || "vi";
  const isCurrentlyPlaying = isPlaying && currentAudioPoi?.id === poi.id;

  useEffect(() => {
    async function checkAudio() {
      if (lang === "vi") return; // Keep default
      try {
        setLoading(true);
        // Triggers backend translation if missing, returns file_path of Gen audio
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
      }
    }
    checkAudio();
  }, [poi.id, lang]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 pointer-events-auto transition-opacity" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[85vh] transform transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 bg-gray-100 rounded-full hover:bg-gray-200">
           <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-gray-900 pr-10">{poi.name}</h2>
        <div className="mt-1 mb-4 text-xs font-semibold text-blue-600 bg-blue-50 inline-block px-2 py-1 rounded">
          Cách bạn {Math.round(poi.distance)}m
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
             <Loader2 className="animate-spin text-blue-500" size={32} />
             <p className="text-sm text-gray-500">Đang tải nội dung ngôn ngữ của bạn...</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto min-h-0 pt-2 pb-4 text-gray-700 text-sm leading-relaxed border-t border-b border-gray-100 mb-4 shrink p-1">
              {translatedText}
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => isCurrentlyPlaying ? pauseAudio() : playAudio(poi)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${
                  isCurrentlyPlaying ? "bg-red-100 text-red-600" : "bg-blue-600 text-white"
                }`}
              >
                {isCurrentlyPlaying ? (
                  <><Pause size={18} /> Tạm dừng</>
                ) : (
                  <><Play size={18} /> Nghe trực tuyến</>
                )}
              </button>

              <button className="flex items-center justify-center w-12 h-12 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors">
                <Download size={20} />
              </button>
            </div>
            
            {/* If no audio URL and not loading, it means it hasn't generated yet (which technically the API does automatically now, but just in case) */}
            {!audioUrl && lang === "vi" && !isCurrentlyPlaying && (
               <div className="mt-3 text-center">
                 <button onClick={() => playAudio(poi)} className="text-sm text-blue-600 underline">Tạo Audio Ngay</button>
               </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
