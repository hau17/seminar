/**
 * UserPoiModal.tsx
 *
 * BLOCK 3C: UI Component — 2 nút Stream / Download + Trạng thái Offline
 * ─────────────────────────────────────────────────────────────────────────
 * Hiển thị modal chi tiết POI với:
 * - Nút "Nghe trực tuyến" (stream, không lưu)
 * - Nút "Tải xuống" / "Đã tải" (cache + offline)
 * - Icon 🔇 + disable khi offline + không có cache
 */

import { useState, useEffect, useRef } from "react";
import { POIWithDistance } from "../hooks/useUserGPS";
import { AudioPlayability } from "../hooks/useAudioPlayer";
import { apiService } from "../../../services/api";
import {
  downloadAudioToCache,
  deleteAudioFromCache,
  isAudioCached,
  DownloadStatus,
} from "../../../services/audioCacheService";
import {
  X,
  Pause,
  Download,
  CheckCircle2,
  Loader2,
  Map as MapIcon,
  Radio,
  VolumeX,
  Trash2,
} from "lucide-react";
import { useOutletContext, useNavigate } from "react-router-dom";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GlobalContext {
  playAudio: (poi: POIWithDistance, overrideUrl?: string | null) => void;
  pauseAudio: () => void;
  currentAudioPoi: POIWithDistance | null;
  isPlaying: boolean;
  isOnline: boolean;
  setMapFocusPoi: (poi: any) => void;
  setHighlightedTour: (tour: any) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UserPoiModal({ poi, onClose }: { poi: POIWithDistance; onClose: () => void }) {
  const navigate = useNavigate();
  const {
    playAudio,
    pauseAudio,
    currentAudioPoi,
    isPlaying,
    isOnline,
    setMapFocusPoi,
    setHighlightedTour,
  } = useOutletContext<GlobalContext>();

  // ── Translated content ────────────────────────────────────────────────────
  const [translatedText, setTranslatedText] = useState(poi.description);
  const [translatedName, setTranslatedName] = useState(poi.name);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const isGeneratingAudio = useRef(false);

  const lang = localStorage.getItem("user_lang") || "vi";
  const isCurrentlyPlaying = isPlaying && currentAudioPoi?.id === poi.id;

  // ── Audio version: lấy từ audio_files[] ──────────────────────────────────
  const audioFileMeta = poi.audio_files?.find((af) => af.language_code === lang)
    ?? poi.audio_files?.find((af) => af.language_code === "vi")
    ?? null;

  const audioVersion = audioFileMeta?.version ?? (poi as any).audio_version ?? 0;
  const hasServerAudio = !!audioFileMeta || !!(poi as any).audio_version;

  // ── Trạng thái Download ───────────────────────────────────────────────────
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  // ── Trạng thái phát (playability) ─────────────────────────────────────────
  const [playability, setPlayability] = useState<AudioPlayability>("loading");

  // ── Kiểm tra cache khi mở modal ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!hasServerAudio || !poi.id) {
        setPlayability("unavailable");
        setDownloadStatus("idle");
        return;
      }

      // Kiểm tra cache
      const cached = await isAudioCached(poi.id, lang, audioVersion);
      if (cancelled) return;

      setDownloadStatus(cached ? "cached" : "idle");

      // Xác định khả năng phát
      if (cached) {
        setPlayability(isOnline ? "playable" : "offline_only");
      } else {
        setPlayability(isOnline ? "playable" : "unavailable");
      }
    }
    init();
    return () => { cancelled = true; };
  }, [poi.id, lang, audioVersion, hasServerAudio, isOnline]);

  // ── Fetch audio/translation (cho ngôn ngữ ngoài vi) ──────────────────────
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
          language_code: lang,
        });
        const details = await res.json();
        if (details.translated_name) setTranslatedName(details.translated_name);
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

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleViewOnMap = () => {
    setMapFocusPoi(poi);
    setHighlightedTour(null);
    onClose();
    navigate("/user/map");
  };

  /** Nút "Nghe trực tuyến" — Stream, không lưu cache */
  const handleStream = () => {
    if (!isOnline) return; // Guard: không online thì nút đã bị disable
    if (isCurrentlyPlaying) {
      pauseAudio();
      return;
    }
    // Phát từ URL stream (không qua cache)
    const streamUrl = `/uploads/audio/poi_${poi.id}_${lang}_v${audioVersion}.mp3`;
    playAudio(poi, streamUrl);
  };

  /** Nút "Tải xuống" — Download vào Cache Storage */
  const handleDownload = async () => {
    if (!poi.id || downloadStatus === "downloading" || downloadStatus === "cached") return;

    setDownloadStatus("downloading");
    setDownloadProgress(0);
    setDownloadMessage(null);

    const result = await downloadAudioToCache(
      poi.id,
      lang,
      audioVersion,
      (progress) => setDownloadProgress(progress)
    );

    setDownloadStatus(result.status);
    setDownloadMessage(result.message ?? null);

    if (result.status === "cached") {
      // Cập nhật playability: giờ đã có cache
      setPlayability(isOnline ? "playable" : "offline_only");
    }
  };

  /** Nút xóa cache (giữ lâu để ra option) */
  const handleDeleteCache = async () => {
    if (!poi.id) return;
    const deleted = await deleteAudioFromCache(poi.id, lang, audioVersion);
    if (deleted) {
      setDownloadStatus("idle");
      setDownloadMessage("Đã xóa file offline.");
      setPlayability(isOnline ? "playable" : "unavailable");
    }
  };

  // ── Helpers render ────────────────────────────────────────────────────────

  const isOfflineAndNoCache = playability === "unavailable";

  /** Label & Icon nút Stream */
  const renderStreamButton = () => {
    if (!hasServerAudio) return null;

    if (isOfflineAndNoCache) {
      return (
        <button
          disabled
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
          title="Không có kết nối mạng và chưa tải xuống"
        >
          <VolumeX size={20} />
          <span>Không phát được</span>
        </button>
      );
    }

    return (
      <button
        onClick={handleStream}
        disabled={!isOnline && playability !== "offline_only"}
        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95
          ${isCurrentlyPlaying
            ? "bg-red-500 text-white shadow-red-200"
            : "bg-blue-600 text-white shadow-blue-200"
          }`}
      >
        {isCurrentlyPlaying ? (
          <><Pause size={20} fill="currentColor" /> Tạm dừng</>
        ) : (
          <><Radio size={18} /> Nghe trực tuyến</>
        )}
      </button>
    );
  };

  /** Label & Icon nút Download */
  const renderDownloadButton = () => {
    if (!hasServerAudio) return null;

    if (downloadStatus === "downloading") {
      return (
        <div className="relative flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl border border-blue-100 overflow-hidden">
          {/* Progress ring */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#dbeafe" strokeWidth="4" />
            <circle
              cx="28" cy="28" r="22" fill="none"
              stroke="#2563eb" strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 22}`}
              strokeDashoffset={`${2 * Math.PI * 22 * (1 - downloadProgress / 100)}`}
              className="transition-all duration-300"
            />
          </svg>
          <Loader2 size={20} className="animate-spin text-blue-600 z-10" />
        </div>
      );
    }

    if (downloadStatus === "cached") {
      return (
        <button
          onClick={handleDeleteCache}
          className="flex items-center justify-center w-14 h-14 bg-green-50 text-green-600 rounded-2xl hover:bg-red-50 hover:text-red-500 active:scale-95 transition-all border border-green-100 group"
          title="Đã tải xuống — Nhấn để xóa"
        >
          <CheckCircle2 size={22} className="group-hover:hidden" />
          <Trash2 size={20} className="hidden group-hover:block" />
        </button>
      );
    }

    if (downloadStatus === "storage_full") {
      return (
        <button
          disabled
          className="flex items-center justify-center w-14 h-14 bg-orange-50 text-orange-400 rounded-2xl cursor-not-allowed border border-orange-100"
          title="Bộ nhớ đầy"
        >
          <Download size={22} />
        </button>
      );
    }

    return (
      <button
        onClick={handleDownload}
        disabled={!isOnline}
        className={`flex items-center justify-center w-14 h-14 rounded-2xl active:scale-95 transition-all border
          ${!isOnline
            ? "bg-gray-50 text-gray-300 cursor-not-allowed border-gray-100"
            : "bg-gray-50 text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 border-gray-100"
          }`}
        title={!isOnline ? "Cần có kết nối để tải xuống" : "Tải xuống để nghe offline"}
      >
        <Download size={22} />
      </button>
    );
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm pointer-events-auto transition-all"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[90vh] transform transition-all border border-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-gray-100/80 backdrop-blur rounded-full hover:bg-gray-200 transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>

          {/* Header */}
          <header className="mb-4">
            <h2 className="text-2xl font-black text-gray-900 pr-10 leading-tight">
              {translatedName}
            </h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Cách bạn {Math.round(poi.distance)}m
              </div>

              {/* Offline badge */}
              {!isOnline && (
                <div className="text-[10px] font-bold uppercase tracking-widest text-orange-600 bg-orange-50 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-orange-200">
                  <VolumeX size={10} />
                  Offline
                </div>
              )}

              {/* Offline_only badge — có cache, offline OK */}
              {playability === "offline_only" && !isOnline && (
                <div className="text-[10px] font-bold uppercase tracking-widest text-green-700 bg-green-50 inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-green-200">
                  ✓ Đã tải xuống
                </div>
              )}
            </div>
          </header>

          {/* Image Gallery */}
          {poi.images && poi.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-4 pt-1 snap-x scrollbar-hide no-scrollbar">
              {poi.images.map((img, idx) => {
                const rawPath = img.file_path;
                const fullPath = rawPath
                  ? rawPath.startsWith("/uploads") ? rawPath : `/uploads/pois/${rawPath}`
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
              <div className="flex-1 overflow-y-auto min-h-[100px] py-4 text-gray-600 text-sm leading-relaxed border-t border-gray-50 mb-4 font-medium">
                {translatedText}
              </div>

              {/* Storage full warning */}
              {downloadStatus === "storage_full" && downloadMessage && (
                <div className="mb-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-2xl text-xs text-orange-700 font-medium">
                  ⚠️ {downloadMessage}
                </div>
              )}

              {/* Download error */}
              {downloadStatus === "error" && downloadMessage && (
                <div className="mb-3 px-4 py-3 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-600 font-medium">
                  {downloadMessage}
                </div>
              )}

              {/* Offline + no cache warning */}
              {isOfflineAndNoCache && hasServerAudio && (
                <div className="mb-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs text-gray-500 font-medium flex items-center gap-2">
                  <VolumeX size={14} className="shrink-0" />
                  Không có mạng. Tải xuống lần sau khi có mạng để nghe offline.
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3">
                {/* Stream / Play button */}
                {renderStreamButton()}

                {/* View on Map */}
                <button
                  onClick={handleViewOnMap}
                  className="flex items-center justify-center w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 active:bg-blue-200 transition-all border border-blue-100"
                  title="Xem trên bản đồ"
                >
                  <MapIcon size={22} />
                </button>

                {/* Download / Cached */}
                {renderDownloadButton()}
              </div>

              {/* Download progress text */}
              {downloadStatus === "downloading" && (
                <p className="text-center text-xs text-blue-500 font-medium mt-2 animate-pulse">
                  Đang tải... {downloadProgress}%
                </p>
              )}

              {/* Success message */}
              {downloadStatus === "cached" && downloadMessage && (
                <p className="text-center text-xs text-green-600 font-medium mt-2">
                  ✓ {downloadMessage}
                </p>
              )}
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
          <img
            src={fullScreenImage}
            alt="Full screen preview"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
