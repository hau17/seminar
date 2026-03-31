/**
 * useAudioPlayer.ts
 *
 * BLOCK 3A: Custom Hook — Nguồn phát (Stream vs Offline) + Fallback mạng
 * ─────────────────────────────────────────────────────────────────────────
 * Logic ưu tiên nguồn:
 *   1. Local Cache (offline) → Blob URL
 *   2. Server Stream URL (online)
 *   3. Lỗi kết nối + không có cache → trạng thái 🔇
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { POIWithDistance } from "./useUserGPS";
import {
  getAudioBlobUrl,
  buildAudioUrl,
  isAudioCached,
} from "../../../services/audioCacheService";
import { POI } from "../../../types";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Trạng thái có thể phát của một POI cụ thể.
 * Dùng để UI quyết định render nút Play/Offline/Loading.
 */
export type AudioPlayability =
  | "loading"      // đang kiểm tra cache
  | "playable"     // có thể phát (có cache hoặc đang online)
  | "offline_only" // chỉ có cache, không online (OK vì đã có cache)
  | "unavailable"; // offline + không có cache → 🔇

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAudioPlayer(nearbyPOIs: POIWithDistance[], language: string) {
  const [currentAudioPoi, setCurrentAudioPoi] = useState<POIWithDistance | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // ── Trạng thái mạng (online/offline) ──────────────────────────────────────
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ── Audio Element ─────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activePoiIdRef = useRef<number | null>(null);
  // Lưu Blob URL hiện tại để revoke khi chuyển bài (tránh memory leak)
  const currentBlobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentAudioPoi(null);
        activePoiIdRef.current = null;
        _revokeBlobUrl();
      };
      audioRef.current.onerror = (e) => {
        console.error(
          "[AudioPlayer] Lỗi phát audio:",
          audioRef.current?.error?.message || "Không thể phát file."
        );
        setIsPlaying(false);
        setCurrentAudioPoi(null);
        activePoiIdRef.current = null;
        _revokeBlobUrl();
      };
    }
  }, []);

  const _revokeBlobUrl = () => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
  };

  // ─── HELPER: Lấy version từ audio_files[] của POI ─────────────────────────

  /**
   * Lấy version và trạng thái audio file của một POI cho ngôn ngữ hiện tại.
   * Ưu tiên lấy từ audio_files[]; fallback về (poi as any).audio_version.
   */
  function getAudioMeta(
    poi: POIWithDistance,
    lang: string
  ): { version: number; hasServerAudio: boolean } {
    const audioFiles = (poi as POI).audio_files;
    if (audioFiles && audioFiles.length > 0) {
      const match = audioFiles.find((af) => af.language_code === lang);
      if (match) return { version: match.version, hasServerAudio: true };
      // Thử fallback về "vi" nếu không có bản ngôn ngữ hiện tại
      const viFallback = audioFiles.find((af) => af.language_code === "vi");
      if (viFallback) return { version: viFallback.version, hasServerAudio: true };
    }
    // Legacy fallback: audio_version trực tiếp trên object
    const legacyVersion = (poi as any).audio_version;
    return { version: legacyVersion || 0, hasServerAudio: !!legacyVersion };
  }

  // ─── BLOCK 3B: Kiểm tra khả năng phát của một POI ─────────────────────────

  /**
   * checkPlayability(poi)
   * Trả về trạng thái "có thể phát" của một POI, dựa vào:
   * - Trạng thái mạng hiện tại
   * - Dữ liệu cache trong Cache Storage
   */
  const checkPlayability = useCallback(
    async (poi: POIWithDistance): Promise<AudioPlayability> => {
      const { version, hasServerAudio } = getAudioMeta(poi, language);

      if (!hasServerAudio) {
        // Server chưa có audio cho POI này
        return isOnline ? "unavailable" : "unavailable";
      }

      const cached = await isAudioCached(poi.id!, language, version);

      if (cached) {
        // Có cache → luôn phát được dù online hay offline
        return isOnline ? "playable" : "offline_only";
      }

      if (isOnline) {
        // Không có cache nhưng online → stream được
        return "playable";
      }

      // Không có cache + offline → 🔇
      return "unavailable";
    },
    [language, isOnline]
  );

  // ─── BLOCK 3C: Hàm phát âm thanh (Cache → Stream → Error) ────────────────

  /**
   * getAudioSource(poi)
   * - Ưu tiên 1: Blob URL từ Cache (offline-first).
   * - Ưu tiên 2: Stream URL từ server.
   * - Trả về null nếu không thể phát.
   */
  const getAudioSource = async (
    poi: POIWithDistance,
    overrideUrl?: string | null
  ): Promise<string | null> => {
    if (overrideUrl) return overrideUrl;

    const { version, hasServerAudio } = getAudioMeta(poi, language);

    if (!hasServerAudio) {
      console.warn(`[AudioPlayer] POI#${poi.id} chưa có file audio trên server.`);
      return null;
    }

    // [Ưu tiên 1] Local Cache
    const blobUrl = await getAudioBlobUrl(poi.id!, language, version);
    if (blobUrl) {
      console.info(`[AudioPlayer] Phát từ Cache (offline): ${blobUrl}`);
      return blobUrl;
    }

    // [Ưu tiên 2] Stream URL (chỉ dùng khi online)
    if (!isOnline) {
      console.warn(`[AudioPlayer] POI#${poi.id} offline + không có cache → 🔇`);
      return null;
    }

    const streamUrl = buildAudioUrl(poi.id!, language, version);
    console.info(`[AudioPlayer] Phát Stream từ server: ${streamUrl}`);
    return streamUrl;
  };

  /**
   * playAudio(poi, overrideUrl?)
   * Phát audio cho một POI. Có thể truyền overrideUrl để bỏ qua logic tìm nguồn.
   */
  const playAudio = async (poi: POIWithDistance, overrideUrl?: string | null) => {
    if (!audioRef.current) return;

    // Dừng bài đang phát nếu có
    if (isPlaying && audioRef.current.src) {
      audioRef.current.pause();
      _revokeBlobUrl();
    }

    const source = await getAudioSource(poi, overrideUrl);

    if (!source) {
      // Không thể phát: offline + không có cache
      console.warn(`[AudioPlayer] Không thể phát POI#${poi.id}: offline + không có cache.`);
      return;
    }

    // Nếu là Blob URL → lưu lại để revoke sau
    if (source.startsWith("blob:")) {
      currentBlobUrlRef.current = source;
    }

    audioRef.current.src = source;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setCurrentAudioPoi(poi);
      activePoiIdRef.current = poi.id!;
    } catch (err) {
      console.warn(
        "[AudioPlayer] Chưa thể tự động phát do chính sách trình duyệt. Cần tương tác người dùng trước."
      );
      _revokeBlobUrl();
    }
  };

  /**
   * pauseAudio()
   */
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentAudioPoi(null);
      activePoiIdRef.current = null;
      _revokeBlobUrl();
    }
  };

  // ─── Logic Trigger GPS (Chạy mỗi khi GPS cập nhật) ───────────────────────

  useEffect(() => {
    if (!nearbyPOIs || nearbyPOIs.length === 0) return;

    // A. [Pre-load logic] Tải ngầm vào cache khi vào vùng 30m
    nearbyPOIs.forEach(async (poi) => {
      const range = poi.range_m ?? 1;
      if (poi.distance <= range + 30) {
        const { version, hasServerAudio } = getAudioMeta(poi, language);
        if (!hasServerAudio || !isOnline) return;

        const targetUrl = buildAudioUrl(poi.id!, language, version);
        const cache = await caches.open("audio-cache-v1");
        const match = await cache.match(targetUrl);
        if (!match) {
          // Pre-cache ngầm (silent)
          cache.add(targetUrl).catch(() => {});
        }
      }
    });

    // B. [Play/Pause logic] Trigger 3s
    const activeZones = nearbyPOIs.filter(
      (poi) => poi.distance <= (poi.range_m ?? 1) + 3
    );
    const targetPoi =
      activeZones.length > 0
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
            playTimerRef.current = null;
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
          pauseTimerRef.current = null;
        }, 3000);
      }
    }
  }, [nearbyPOIs, language, isOnline]);

  return {
    currentAudioPoi,
    isPlaying,
    isOnline,
    playAudio,
    pauseAudio,
    checkPlayability,
    getAudioMeta,
  };
}
