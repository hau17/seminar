import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Map, Info, LogOut, Wifi } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { apiService } from "../../services/api";
import { POI, Tour } from "../../types";
import { useUserGPS } from "./hooks/useUserGPS";
import { useAudioPlayer } from "./hooks/useAudioPlayer";
import { syncAudioCache } from "../../services/audioCacheService";
import { useTranslation } from "react-i18next";

export function UserLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [pois, setPois] = useState<POI[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [highlightedTour, setHighlightedTour] = useState<Tour | null>(null);
  const [mapFocusPoi, setMapFocusPoi] = useState<POI | null>(null);
  // isSyncing: true khi đang chạy Session Init → hiển thị màn hình chờ blocking
  const [isSyncing, setIsSyncing] = useState(true);
  const [syncStatus, setSyncStatus] = useState(t("layout.sync.loading"));

  const userLang = localStorage.getItem("user_lang") || "vi";
  const userToken = localStorage.getItem("user_token");

  const isCacheSynced = useRef(false);
  const isFetchingData = useRef(false);

  // Fetch all POIs & Tours once, then run Session Init
  useEffect(() => {
    if (isFetchingData.current) return;
    isFetchingData.current = true;

    async function load() {
      try {
        // Bước 1: Lấy data POI + Tour
        setSyncStatus(t("layout.sync.loading"));
        const [poisRes, toursRes] = await Promise.all([
          apiService.get("/api/user/pois/nearby"),
          apiService.get("/api/user/tours"),
        ]);

        const poisData = await poisRes.json();
        const toursData = await toursRes.json();

        setPois(poisData);
        setTours(toursData);

        // Bước 2: Đồng bộ Cache Audio Version (dùng audioCacheService)
        if (!isCacheSynced.current) {
          setSyncStatus(t("layout.sync.cache"));
          await syncAudioCache(poisData);
          isCacheSynced.current = true;
        }

        // Bước 3: Session Init — Dịch ngầm name + description
        // Chỉ chạy nếu ngôn ngữ không phải tiếng Việt VÀ đã đăng nhập
        if (userLang !== "vi" && userToken) {
          setSyncStatus(t("layout.sync.lang"));

          // Lấy vị trí GPS hiện tại (best-effort, không block nếu từ chối)
          const getCoords = (): Promise<{ lat: number; lng: number } | null> =>
            new Promise((resolve) => {
              if (!navigator.geolocation) return resolve(null);
              navigator.geolocation.getCurrentPosition(
                (pos) =>
                  resolve({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  }),
                () => resolve(null),
                { timeout: 5000 }
              );
            });

          const coords = await getCoords();
          if (coords) {
            try {
              const initRes = await apiService.post("/api/user/session-init", {
                language_code: userLang,
                lat: coords.lat,
                lng: coords.lng,
              });
              const initData = await initRes.json();
              if (initData.success && initData.pois && initData.tours) {
                // Sử dụng trực tiếp data đã được Backend dịch và làm phẳng
                setPois(initData.pois);
                setTours(initData.tours);
              }
            } catch (e) {
              console.warn("[Session Init] Lỗi dịch ngôn ngữ, giữ data mặc định:", e);
            }
          }
        }
      } catch (e) {
        console.error("Lỗi fetch data khởi tạo:", e);
      } finally {
        // Dù thành công hay lỗi, đều ẩn màn hình chờ
        setIsSyncing(false);
      }
    }
    load();
  }, []);

  const changeLanguage = async (code: string) => {
    localStorage.setItem("user_lang", code);
    i18n.changeLanguage(code);
    setIsSyncing(true);
    
    try {
      // Re-run the full sync sequence
      const [poisRes, toursRes] = await Promise.all([
        apiService.get("/api/user/pois/nearby"),
        apiService.get("/api/user/tours"),
      ]);
      const poisData = await poisRes.json();
      const toursData = await toursRes.json();
      setPois(poisData);
      setTours(toursData);

      if (code !== "vi" && userToken) {
        setSyncStatus(t("layout.sync.lang"));
        const getCoords = (): Promise<{ lat: number; lng: number } | null> =>
          new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              () => resolve(null),
              { timeout: 5000 }
            );
          });

        const coords = await getCoords();
        if (coords) {
          const initRes = await apiService.post("/api/user/session-init", {
            language_code: code,
            lat: coords.lat,
            lng: coords.lng,
          });
          const initData = await initRes.json();
          if (initData.success && initData.pois && initData.tours) {
            setPois(initData.pois);
            setTours(initData.tours);
          }
        }
      }
    } catch (e) {
      console.error("Lỗi đổi ngôn ngữ:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const refreshData = async () => {
    try {
      const [poisRes, toursRes] = await Promise.all([
        apiService.get("/api/user/pois/nearby"),
        apiService.get("/api/user/tours"),
      ]);
      const poisData = await poisRes.json();
      const toursData = await toursRes.json();
      setPois(poisData);
      setTours(toursData);
    } catch (e) {
      console.error("Lỗi refresh data:", e);
    }
  };

  const { userLocation, nearbyPOIs, nearbyTours, gpsError, requestPermission } =
    useUserGPS(pois, tours);
  const { currentAudioPoi, isPlaying, isOnline, playAudio, pauseAudio } = useAudioPlayer(
    nearbyPOIs,
    userLang
  );

  const handleLogout = () => {
    localStorage.removeItem("user_token");
    localStorage.removeItem("user_info");
    localStorage.removeItem("user_lang");
    navigate("/user/login");
  };

  const tabs = [
    { name: t("layout.tabs.info"), path: "/user/info", icon: Info },
    { name: t("layout.tabs.map"), path: "/user/map", icon: Map },
  ];

  // ── Màn hình blocking Session Init ──────────────────────────────────────────
  if (isSyncing) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-blue-600 text-white gap-6 px-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
            <Wifi size={40} className="text-white" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">{t("layout.title")}</h2>
        </div>
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <div className="w-full bg-white/20 rounded-full h-1.5">
            <div className="bg-white h-1.5 rounded-full w-3/4 transition-all duration-500" />
          </div>
          <p className="text-sm text-blue-100 font-medium text-center animate-pulse">
            {syncStatus}
          </p>
        </div>
        <p className="text-xs text-blue-200 text-center max-w-xs">
          {t("layout.sync.preparing")}
        </p>
      </div>
    );
  }
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen w-full flex flex-col bg-gray-50 relative">
      <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center z-10 shrink-0">
        <h1 className="font-bold text-lg">{t("layout.title")}</h1>
        <button
          onClick={handleLogout}
          className="p-2 bg-blue-700 rounded-full hover:bg-blue-800 transition"
        >
          <LogOut size={16} />
        </button>
      </header>

      {/* Global Background Audio indicator */}
      {isPlaying && currentAudioPoi && (
        <div className="bg-green-100 text-green-800 px-4 py-2 text-sm text-center flex items-center justify-center shrink-0">
          <span className="animate-pulse mr-2 w-2 h-2 rounded-full bg-green-500"></span>
          {t("poi.now_playing", { name: currentAudioPoi.translated_name || currentAudioPoi.name })}
        </div>
      )}

      {gpsError && (
        <div className="bg-red-100 text-red-800 px-4 py-2 text-xs text-center shrink-0">
          {gpsError}
        </div>
      )}

      <main className="flex-1 overflow-hidden relative z-0 pb-16">
        {/* Pass down everything globally via Router Outlet */}
        <Outlet
          context={{
            userLocation,
            nearbyPOIs,
            nearbyTours,
            currentAudioPoi,
            isPlaying,
            isOnline,
            playAudio,
            pauseAudio,
            requestPermission,
            highlightedTour,
            setHighlightedTour,
            mapFocusPoi,
            setMapFocusPoi,
            refreshData,
            changeLanguage,
          }}
        />
      </main>

      <nav className="fixed bottom-0 left-0 w-full h-16 bg-white border-t border-gray-200 flex shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
        {tabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => {
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
