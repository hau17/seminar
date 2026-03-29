import { useState, useEffect, useRef } from "react";
import { POIWithDistance } from "./useUserGPS";

const CACHE_NAME = "audio-cache";

export function useAudioPlayer(nearbyPOIs: POIWithDistance[], language: string) {
  const [currentAudioPoi, setCurrentAudioPoi] = useState<POIWithDistance | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activePoiIdRef = useRef<number | null>(null);

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

  /**
   * Helper: Lấy URL Audio (Ưu tiên Cache Storage -> Fallback Stream URL)
   * TUYỆT ĐỐI TIN TƯỞNG CACHE: Không gọi API check version tại đây.
   */
  const getAudioUrl = async (poiId: number, lang: string, version: number) => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const targetUrl = `/uploads/audio/poi_${poiId}_${lang}_v${version}.mp3`;

      // 1. Kiểm tra đối khớp trong Cache Storage
      const cachedResponse = await cache.match(targetUrl);
      if (cachedResponse) {
        // [Zero-latency] Lấy trực tiếp từ bộ nhớ đệm
        const blob = await cachedResponse.blob();
        return URL.createObjectURL(blob);
      }

      // 2. [Fallback] Stream trực tiếp từ server nếu chưa kịp cache
      return targetUrl;
    } catch (e) {
      return `/uploads/audio/poi_${poiId}_${lang}_v${version}.mp3`;
    }
  };

  // Hàm phát nhạc
  const playAudio = async (poi: POIWithDistance) => {
    if (!audioRef.current) return;
    
    // Lấy version từ dữ liệu server đã có (Session Init đã Sync xong)
    const serverVersion = (poi as any).audio_version || 0;
    
    const finalUrl = await getAudioUrl(poi.id!, language, serverVersion);
    
    audioRef.current.src = finalUrl;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setCurrentAudioPoi(poi);
      activePoiIdRef.current = poi.id!;
    } catch (err) {
      console.warn("Chưa thể tự động phát audio do chính sách bảo mật trình duyệt. Cần người dùng tương tác với bản đồ trước.");
    }
  };

  // Hàm dừng nhạc
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentAudioPoi(null);
      activePoiIdRef.current = null;
    }
  };

  /**
   * Logic Trigger GPS (Chạy mỗi khi GPS cập nhật)
   */
  useEffect(() => {
    if (!nearbyPOIs || nearbyPOIs.length === 0) return;

    // A. [Pre-load logic] Tải ngầm nếu vào vùng 30m (Optional nhưng hữu ích)
    nearbyPOIs.forEach(async (poi) => {
      const range = poi.range_m ?? 1;
      if (poi.distance <= range + 30) {
        const version = (poi as any).audio_version || 0;
        const targetUrl = `/uploads/audio/poi_${poi.id}_${language}_v${version}.mp3`;
        const cache = await caches.open(CACHE_NAME);
        const match = await cache.match(targetUrl);
        if (!match) {
          // Chỉ tải nếu chưa có trong cache
          cache.add(targetUrl).catch(() => {}); 
        }
      }
    });

    // B. [Play/Pause logic] 3m - 3s Trigger
    const activeZones = nearbyPOIs.filter((poi) => poi.distance <= (poi.range_m ?? 1) + 3);
    const targetPoi = activeZones.length > 0
      ? activeZones.reduce((prev, curr) => (prev.id! > curr.id! ? prev : curr))
      : null;

    if (targetPoi) {
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
      }

      if (activePoiIdRef.current !== targetPoi.id) {
        if (!playTimerRef.current) {
          playTimerRef.current = setTimeout(() => {
            playAudio(targetPoi);
          }, 3000);
        }
      }
    } else {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
        playTimerRef.current = null;
      }

      if (activePoiIdRef.current !== null && !pauseTimerRef.current) {
        pauseTimerRef.current = setTimeout(() => {
          pauseAudio();
        }, 3000);
      }
    }
  }, [nearbyPOIs, language]);

  return { currentAudioPoi, isPlaying, playAudio, pauseAudio };
}
