import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Map, Info, LogOut } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { apiService } from "../../services/api";
import { POI, Tour } from "../../types";
import { useUserGPS } from "./hooks/useUserGPS";
import { useAudioPlayer } from "./hooks/useAudioPlayer";

export function UserLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [pois, setPois] = useState<POI[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [highlightedTour, setHighlightedTour] = useState<Tour | null>(null);
  const [mapFocusPoi, setMapFocusPoi] = useState<POI | null>(null);
  const userLang = localStorage.getItem("user_lang") || "vi";

  const isCacheSynced = useRef(false);
  const isFetchingData = useRef(false);

  // Sync Cache Version logic (Session Init - Chạy 1 lần duy nhất)
  const syncAudioCacheVersions = async (serverPois: POI[]) => {
    if (isCacheSynced.current) return;
    
    console.log("Session Init: Bắt đầu đối chiếu Version Audio Cache...");
    try {
      const cache = await caches.open("audio-cache");
      const keys = await cache.keys();
      
      for (const request of keys) {
        const url = request.url;
        // Regex bóc tách: poi_{id}_{lang}_v{version}.mp3
        const match = url.match(/poi_(\d+)_([a-z]{2})_v(\d+)\.mp3/);
        
        if (match) {
          const poiId = parseInt(match[1]);
          // const lang = match[2];
          const localVersion = parseInt(match[3]);
          
          const serverPoi = serverPois.find(p => p.id === poiId);
          if (serverPoi) {
            // Lấy version mới nhất từ server data (trả về từ API nearby)
            const serverVersion = (serverPoi as any).audio_version || 0;
            
            if (localVersion < serverVersion) {
              console.log(`[Cache Cleanup] Xóa bản cũ POI ${poiId}: v${localVersion} (Mới: v${serverVersion})`);
              await cache.delete(request);
            }
          }
        }
      }
      isCacheSynced.current = true;
      console.log("Session Init: Hoàn tất đồng bộ Cache.");
    } catch (e) {
      console.error("Lỗi đồng bộ Cache:", e);
    }
  };

  // Fetch all POIs & Tours once
  useEffect(() => {
    if (isFetchingData.current) return;
    isFetchingData.current = true;
    
    async function load() {
      try {
        const [poisRes, toursRes] = await Promise.all([
          apiService.get("/api/user/pois/nearby"),
          apiService.get("/api/user/tours")
        ]);
        
        const poisData = await poisRes.json();
        const toursData = await toursRes.json();
        
        setPois(poisData);
        setTours(toursData);
        
        // Kích hoạt đồng bộ Cache ngay khi có dữ liệu từ server
        await syncAudioCacheVersions(poisData);
      } catch (e) {
        console.error("Lỗi fetch data khởi tạo:", e);
      }
    }
    load();
  }, []);

  const refreshData = async () => {
    try {
      const [poisRes, toursRes] = await Promise.all([
        apiService.get("/api/user/pois/nearby"),
        apiService.get("/api/user/tours")
      ]);
      const poisData = await poisRes.json();
      const toursData = await toursRes.json();
      setPois(poisData);
      setTours(toursData);
    } catch (e) {
      console.error("Lỗi refresh data:", e);
    }
  };

  const { userLocation, nearbyPOIs, nearbyTours, gpsError, requestPermission } = useUserGPS(pois, tours);
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
        <Outlet context={{ 
          userLocation, 
          nearbyPOIs, 
          nearbyTours, 
          currentAudioPoi, 
          isPlaying, 
          playAudio, 
          pauseAudio, 
          requestPermission,
          highlightedTour,
          setHighlightedTour,
          mapFocusPoi,
          setMapFocusPoi,
          refreshData // Added refresh callback
        }} />
      </main>

      <nav className="fixed bottom-0 left-0 w-full h-16 bg-white border-t border-gray-200 flex shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => {
                // Only reset highlights if navigating AWAY from the map manually or to Info
                if (tab.path === "/user/info") {
                  setHighlightedTour(null);
                  setMapFocusPoi(null);
                }
                navigate(tab.path);
              }}
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
