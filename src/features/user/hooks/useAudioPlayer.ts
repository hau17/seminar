import { useState, useEffect, useRef } from "react";
import { POIWithDistance } from "./useUserGPS";
import { apiService } from "../../../services/api";

const CACHE_NAME = "gps-audio-cache-v1";

export function useAudioPlayer(nearbyPOIs: POIWithDistance[], language: string) {
  const [currentAudioPoi, setCurrentAudioPoi] = useState<POIWithDistance | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activePoiIdRef = useRef<number | null>(null);
  const generatingPois = useRef<Set<number>>(new Set());
  const fetchedDetailsCache = useRef<Map<number, { filePath: string }>>(new Map());

  // Khởi tạo Audio Element
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentAudioPoi(null);
        activePoiIdRef.current = null;
      };
    }
  }, []);

  // 1. Helper: Kiểm tra dung lượng máy >= 50MB
  const checkStorageQuota = async (): Promise<boolean> => {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const quota = estimate.quota || 0;
        const usage = estimate.usage || 0;
        const freeMB = (quota - usage) / (1024 * 1024);
        return freeMB >= 50;
      } catch (e) {
        return true;
      }
    }
    return true; // Trình duyệt không hỗ trợ API -> giả định là đủ không gian
  };

  // 2. Helper: Lấy thông tin Audio từ Backend (Auto-gen nếu chưa có)
  const fetchAudioDetails = async (poiId: number, lang: string) => {
    try {
      const res = await apiService.post("/api/audio/generate", { poi_id: poiId, language_code: lang });
      const data = await res.json();
      return { filePath: data.file_path, version: data.audio_version };
    } catch (e) {
      console.error("Lỗi lấy Audio:", e);
      return null;
    }
  };

  // 3. Helper: Xử lý Cache (Versioning & Storage)
  const getAudioUrlWithCache = async (poiId: number, lang: string, filePath: string, allowCaching: boolean) => {
    const cache = await caches.open(CACHE_NAME);
    const audioUrl = filePath; // Đường dẫn từ server, vd: /uploads/audio/poi_1_vi_v2.mp3

    // Xóa các file version cũ của POI này trong Cache
    const keys = await cache.keys();
    for (const req of keys) {
      // Nếu file thuộc POI và Lang này, nhưng khác đường dẫn (tức là khác version) -> Xóa
      if (req.url.includes(`/poi_${poiId}_${lang}_v`) && !req.url.endsWith(audioUrl)) {
        await cache.delete(req);
      }
    }

    // Kiểm tra file hiện tại đã có trong Cache chưa
    const cachedResponse = await cache.match(audioUrl);
    if (cachedResponse) {
      const blob = await cachedResponse.blob();
      return URL.createObjectURL(blob);
    }

    // Nếu chưa có trong cache và được phép cache (pre-load) thì tải về
    if (allowCaching) {
      const hasSpace = await checkStorageQuota();
      if (hasSpace) {
        try {
          await cache.add(audioUrl);
          const newRes = await cache.match(audioUrl);
          if (newRes) {
            const blob = await newRes.blob();
            return URL.createObjectURL(blob);
          }
        } catch (err) {
          console.warn("Không thể cache file:", err);
        }
      }
    }

    return audioUrl; // Fallback: Stream trực tuyến
  };

  // 4. Bật Audio
  const playAudio = async (poi: POIWithDistance) => {
    try {
      if (!audioRef.current) return;

      const details = await fetchAudioDetails(poi.id!, language);
      if (!details || !details.filePath) return;

      // Chuẩn bị URL (Từ Cache offline hoặc Stream online)
      const finalUrl = await getAudioUrlWithCache(poi.id!, language, details.filePath, true);

      audioRef.current.src = finalUrl;
      await audioRef.current.play();
      
      setIsPlaying(true);
      setCurrentAudioPoi(poi);
      activePoiIdRef.current = poi.id!;
    } catch (error) {
      console.error("Không thể phát audio:", error);
    }
  };

  // 5. Tạm dừng Audio
  const pauseAudio = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentAudioPoi(null);
      activePoiIdRef.current = null;
    }
  };


  // 6. Logic Background chính (Chạy mội khi nearbyPOIs update từ GPS)
  useEffect(() => {
    if (!nearbyPOIs || nearbyPOIs.length === 0) return;

    // --- A. Logic Auto-gen (100m) và Pre-load Cache (30m) ---
    nearbyPOIs.forEach(async (poi) => {
      if (!poi.id) return;
      const range = poi.range_m ?? 1;
      
      // Auto-gen nền nếu vào vùng 100m
      if (poi.distance <= range + 100) {
        
        // CƠ CHẾ KHÓA CHỐNG SPAM API
        if (generatingPois.current.has(poi.id)) return;
        
        // Cache kết quả thành công để KHÔNG GỌI LẠI ở những tick GPS tiếp theo
        let details = fetchedDetailsCache.current.get(poi.id);

        if (!details) {
          generatingPois.current.add(poi.id);
          try {
            const fetched = await fetchAudioDetails(poi.id, language);
            if (fetched) {
              details = { filePath: fetched.filePath };
              fetchedDetailsCache.current.set(poi.id, details);
            }
          } catch (error) {
            console.error("Auto-gen API Error:", error);
          } finally {
            generatingPois.current.delete(poi.id);
          }
        }
        
        // Pre-load tải offline nếu vào vùng 30m
        if (poi.distance <= range + 30 && details?.filePath) {
          getAudioUrlWithCache(poi.id, language, details.filePath, true);
        }
      }
    });

    // --- B. Logic Play / Pause 3s Trigger ---
    // Lọc các POI nằm trong vùng kích hoạt (distance <= range + 3)
    const activeZones = nearbyPOIs.filter((poi) => poi.distance <= (poi.range_m ?? 1) + 3);

    // Ưu tiên POI có ID lớn nhất nếu nằm trong vùng đè lấp (Overlap)
    const targetPoi = activeZones.length > 0
      ? activeZones.reduce((prev, current) => (prev.id! > current.id! ? prev : current))
      : null;

    if (targetPoi) {
      // Đang nằm trong vùng phát âm thanh -> Hủy timer tắt (nếu đang đếm)
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }

      // Nếu POI hiện tại chưa phát -> Bắt đầu đếm bộ đếm 3 giây để kích hoạt bật
      if (activePoiIdRef.current !== targetPoi.id) {
        if (!playTimerRef.current) {
          playTimerRef.current = setTimeout(() => {
            playAudio(targetPoi);
          }, 3000);
        }
      }
    } else {
      // Đã thoát ra khỏi tất cả các vùng phát -> Hủy timer bật (nếu đang đếm)
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
        playTimerRef.current = null;
      }

      // Nếu đang phát âm thanh -> Bắt đầu đếm bộ đếm 3 giây để kích hoạt tắt
      if (activePoiIdRef.current !== null && !pauseTimerRef.current) {
        pauseTimerRef.current = setTimeout(() => {
          pauseAudio();
        }, 3000);
      }
    }
  }, [nearbyPOIs, language]);

  return { currentAudioPoi, isPlaying, playAudio, pauseAudio };
}
