import { useOutletContext } from "react-router-dom";
import { POIWithDistance } from "../hooks/useUserGPS";
import { Globe, Settings, MapPin, Navigation } from "lucide-react";
import { useState } from "react";
import { UserPoiModal } from "../components/UserPoiModal";

interface GlobalContext {
  userLocation: { lat: number; lng: number } | null;
  nearbyPOIs: POIWithDistance[];
  currentAudioPoi: POIWithDistance | null;
  isPlaying: boolean;
}

export function InfoTab() {
  const { nearbyPOIs } = useOutletContext<GlobalContext>();
  const [selectedPoi, setSelectedPoi] = useState<POIWithDistance | null>(null);
  const lang = localStorage.getItem("user_lang") || "vi";

  return (
    <div className="p-4 bg-gray-50 min-h-full">
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe className="text-blue-500" />
          <div>
            <p className="text-sm text-gray-500">Ngôn ngữ hiện tại</p>
            <p className="font-semibold text-gray-900">{lang.toUpperCase()}</p>
          </div>
        </div>
        <button className="text-blue-600 text-sm">Thay đổi</button>
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        <MapPin size={20} className="text-red-500" /> Địa điểm gần đây
      </h2>
      <div className="space-y-3 mb-8">
        {nearbyPOIs.slice(0, 5).map((poi) => (
          <div
            key={poi.id}
            onClick={() => setSelectedPoi(poi)}
            className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer active:scale-95 transition-transform"
          >
            <div>
              <h3 className="font-semibold text-gray-800">{poi.name}</h3>
              <p className="text-xs text-gray-500 line-clamp-1">{poi.description}</p>
            </div>
            <div className="text-right shrink-0 ml-3">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {Math.round(poi.distance)}m
              </span>
            </div>
          </div>
        ))}
        {nearbyPOIs.length === 0 && <p className="text-sm text-gray-500 italic">Đang tìm địa điểm...</p>}
      </div>

      <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
        <Navigation size={20} className="text-green-500" /> Tour nổi bật
      </h2>
      <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100 text-center">
        <p className="text-sm text-gray-500">Chưa có tour nào xung quanh bạn.</p>
      </div>

      {selectedPoi && <UserPoiModal poi={selectedPoi} onClose={() => setSelectedPoi(null)} />}
    </div>
  );
}
