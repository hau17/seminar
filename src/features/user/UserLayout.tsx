import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Map, Info, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { apiService } from "../../services/api";
import { POI } from "../../types";
import { useUserGPS } from "./hooks/useUserGPS";
import { useAudioPlayer } from "./hooks/useAudioPlayer";

export function UserLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [pois, setPois] = useState<POI[]>([]);
  const userLang = localStorage.getItem("user_lang") || "vi";

  // Fetch all POIs once, user hook filters distances
  useEffect(() => {
    async function load() {
      try {
        const res = await apiService.get("/api/user/pois/nearby");
        const data = await res.json();
        setPois(data);
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  const { userLocation, nearbyPOIs, gpsError, requestPermission } = useUserGPS(pois);
  const { currentAudioPoi, isPlaying, playAudio, pauseAudio } = useAudioPlayer(nearbyPOIs, userLang);

  const handleLogout = () => {
    localStorage.removeItem("user_token");
    localStorage.removeItem("user_info");
    localStorage.removeItem("user_lang");
    navigate("/user/login");
  };

  const tabs = [
    { name: "Thông tin", path: "/user/info", icon: Info },
    { name: "Bản đồ", path: "/user/map", icon: Map },
  ];

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 relative">
      <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center z-10 shrink-0">
        <h1 className="font-bold text-lg">GPS Tour Guide</h1>
        <button onClick={handleLogout} className="p-2 bg-blue-700 rounded-full hover:bg-blue-800 transition">
          <LogOut size={16} />
        </button>
      </header>

      {/* Global Background Audio indicator */}
      {isPlaying && currentAudioPoi && (
        <div className="bg-green-100 text-green-800 px-4 py-2 text-sm text-center flex items-center justify-center shrink-0">
          <span className="animate-pulse mr-2 w-2 h-2 rounded-full bg-green-500"></span>
          Đang phát: {currentAudioPoi.name}
        </div>
      )}

      {gpsError && (
        <div className="bg-red-100 text-red-800 px-4 py-2 text-xs text-center shrink-0">
          {gpsError}
        </div>
      )}

      <main className="flex-1 overflow-hidden relative z-0 pb-16">
        {/* Pass down everything globally via Router Outlet */}
        <Outlet context={{ userLocation, nearbyPOIs, currentAudioPoi, isPlaying, playAudio, pauseAudio, requestPermission }} />
      </main>

      <nav className="fixed bottom-0 left-0 w-full h-16 bg-white border-t border-gray-200 flex shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex-1 flex flex-col items-center justify-center transition-colors ${
                isActive ? "text-blue-600" : "text-gray-500 hover:text-blue-400"
              }`}
            >
              <tab.icon size={24} className={isActive ? "animate-bounce" : ""} />
              <span className="text-xs font-medium mt-1">{tab.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
