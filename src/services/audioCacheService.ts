/**
 * audioCacheService.ts
 *
 * BLOCK 1: Cache Manager & Session Init
 * ─────────────────────────────────────
 * Chiến lược: Dùng Browser Cache API (Cache Storage) với key là URL audio.
 * Convention đặt tên: /uploads/audio/poi_{id}_{lang}_v{version}.mp3
 *
 * Tại sao Cache API thay vì LocalForage/IndexedDB?
 * - Cache API tích hợp sẵn với Service Worker → có thể offline-first.
 * - Request matching theo URL giúp bóc tách version (regex trên URL).
 * - Không cần serialize/deserialize binary blob thủ công.
 */

import { POI } from "../types";

export const AUDIO_CACHE_NAME = "audio-cache-v1";

/** Ngưỡng dung lượng tối thiểu cần trống để cho phép tải (Mục 12.6 PRD) */
const MIN_FREE_STORAGE_MB = 50;

// ─── HELPER ──────────────────────────────────────────────────────────────────

/**
 * Tạo URL chuẩn cho một file audio.
 * Convention: /uploads/audio/poi_{poiId}_{lang}_v{version}.mp3
 */
export function buildAudioUrl(poiId: number, lang: string, version: number): string {
  return `/uploads/audio/poi_${poiId}_${lang}_v${version}.mp3`;
}

/**
 * Bóc tách metadata từ URL audio.
 * Trả về { poiId, lang, version } hoặc null nếu URL không hợp lệ.
 */
function parseAudioUrl(url: string): { poiId: number; lang: string; version: number } | null {
  const match = url.match(/poi_(\d+)_([a-z]{2})_v(\d+)\.mp3/);
  if (!match) return null;
  return {
    poiId: parseInt(match[1]),
    lang: match[2],
    version: parseInt(match[3]),
  };
}

// ─── BLOCK 1A: SESSION INIT — Đồng bộ phiên bản cache ───────────────────────

/**
 * syncAudioCache(serverPois)
 *
 * Được gọi một lần duy nhất khi khởi động app (Session Init).
 * Quét toàn bộ Cache Storage → so sánh local_version với server_version.
 * Nếu local < server → xóa file cũ BẮT BUỘC (PRD §7.4.2).
 *
 * @param serverPois - Danh sách POI đã fetch từ server (có audio_files[])
 */
export async function syncAudioCache(serverPois: POI[]): Promise<void> {
  if (!("caches" in window)) {
    console.warn("[AudioCache] Cache API không được hỗ trợ trên trình duyệt này.");
    return;
  }

  console.info("[AudioCache] Session Init: Bắt đầu đồng bộ version cache...");

  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const cachedRequests = await cache.keys();

    // Build lookup map: poiId → server version (từ audio_files[])
    const serverVersionMap = new Map<string, number>(); // key: `${poiId}_${lang}`
    for (const poi of serverPois) {
      if (!poi.id || !poi.audio_files) continue;
      for (const af of poi.audio_files) {
        serverVersionMap.set(`${poi.id}_${af.language_code}`, af.version);
      }
    }

    let deletedCount = 0;
    for (const request of cachedRequests) {
      const parsed = parseAudioUrl(request.url);
      if (!parsed) continue;

      const { poiId, lang, version: localVersion } = parsed;
      const serverVersion = serverVersionMap.get(`${poiId}_${lang}`);

      // Nếu server_version mới hơn → xóa bản cũ (BẮT BUỘC)
      if (serverVersion !== undefined && localVersion < serverVersion) {
        console.log(
          `[AudioCache] Xóa cache lỗi thời: POI#${poiId} [${lang}] local=v${localVersion} < server=v${serverVersion}`
        );
        await cache.delete(request);
        deletedCount++;
      }

      // Nếu POI không còn tồn tại trên server → dọn dẹp luôn
      if (serverVersion === undefined) {
        const poiExists = serverPois.some((p) => p.id === poiId);
        if (!poiExists) {
          await cache.delete(request);
          deletedCount++;
        }
      }
    }

    console.info(
      `[AudioCache] Session Init hoàn tất. Đã xóa ${deletedCount} file lỗi thời.`
    );
  } catch (err) {
    console.error("[AudioCache] Lỗi không thể phục hồi trong Session Init:", err);
  }
}

// ─── BLOCK 1B: KIỂM TRA CACHE ────────────────────────────────────────────────

/**
 * isAudioCached(poiId, lang, version)
 *
 * Kiểm tra xem file audio của một POI đã được cache chưa.
 * Dùng bởi UI để quyết định hiển thị nút "Đã tải" hay "Tải xuống".
 */
export async function isAudioCached(
  poiId: number,
  lang: string,
  version: number
): Promise<boolean> {
  if (!("caches" in window)) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const match = await cache.match(buildAudioUrl(poiId, lang, version));
    return !!match;
  } catch {
    return false;
  }
}

/**
 * getAudioBlobUrl(poiId, lang, version)
 *
 * Lấy Blob URL từ cache để phát offline.
 * Trả về null nếu chưa có cache.
 */
export async function getAudioBlobUrl(
  poiId: number,
  lang: string,
  version: number
): Promise<string | null> {
  if (!("caches" in window)) return null;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const targetUrl = buildAudioUrl(poiId, lang, version);
    const response = await cache.match(targetUrl);
    if (!response) return null;
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

// ─── BLOCK 2: DOWNLOAD & STORAGE CHECK ───────────────────────────────────────

/**
 * Kiểm tra dung lượng thiết bị (PRD §12.6).
 * Dùng Storage Manager API nếu có, fallback về "luôn đủ" cho browser cũ.
 * @returns { hasSufficientSpace: boolean; freeMB: number | null }
 */
export async function checkStorageQuota(): Promise<{
  hasSufficientSpace: boolean;
  freeMB: number | null;
}> {
  if (!navigator.storage?.estimate) {
    // Trình duyệt cũ → giả định đủ dung lượng
    return { hasSufficientSpace: true, freeMB: null };
  }

  try {
    const { quota = 0, usage = 0 } = await navigator.storage.estimate();
    const freeMB = (quota - usage) / (1024 * 1024);
    return {
      hasSufficientSpace: freeMB >= MIN_FREE_STORAGE_MB,
      freeMB: Math.round(freeMB),
    };
  } catch {
    return { hasSufficientSpace: true, freeMB: null };
  }
}

export type DownloadStatus = "idle" | "downloading" | "cached" | "error" | "storage_full";

export interface DownloadResult {
  status: DownloadStatus;
  message?: string;
}

/**
 * downloadAudioToCache(poiId, lang, version, onProgress?)
 *
 * Xử lý nút "Tải xuống":
 * 1. Kiểm tra dung lượng thiết bị (§12.6).
 * 2. Tải file từ server stream URL.
 * 3. Lưu vào Cache API.
 * 4. Trả về kết quả để UI cập nhật trạng thái.
 */
export async function downloadAudioToCache(
  poiId: number,
  lang: string,
  version: number,
  onProgress?: (progress: number) => void
): Promise<DownloadResult> {
  if (!("caches" in window)) {
    return { status: "error", message: "Trình duyệt không hỗ trợ lưu offline." };
  }

  // ── Kiểm tra đã cache rồi chưa ──
  const alreadyCached = await isAudioCached(poiId, lang, version);
  if (alreadyCached) {
    return { status: "cached", message: "File đã được tải xuống." };
  }

  // ── Kiểm tra dung lượng (PRD §12.6) ──
  const { hasSufficientSpace, freeMB } = await checkStorageQuota();
  if (!hasSufficientSpace) {
    const freeText = freeMB !== null ? ` (còn ${freeMB}MB)` : "";
    return {
      status: "storage_full",
      message: `Không đủ dung lượng${freeText}. Vui lòng dùng chức năng nghe trực tuyến hoặc giải phóng bộ nhớ.`,
    };
  }

  const audioUrl = buildAudioUrl(poiId, lang, version);

  try {
    onProgress?.(0);

    // Tải file với Fetch API để theo dõi tiến trình
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Đọc body dạng stream để tính progress
    const contentLength = response.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : null;
    const reader = response.body?.getReader();
    const chunks: Blob[] = [];
    let received = 0;

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // Wrap từng chunk thành Blob để tránh ArrayBufferLike type issues
        chunks.push(new Blob([value], { type: "audio/mpeg" }));
        received += value.byteLength;
        if (total) {
          onProgress?.(Math.round((received / total) * 100));
        }
      }
    }

    // Gộp tất cả Blob chunks thành một Blob cuối
    const blob = new Blob(chunks, { type: "audio/mpeg" });
    const cachedResponse = new Response(blob, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(blob.size),
        "X-Cached-At": new Date().toISOString(),
        "X-Audio-Version": String(version),
      },
    });

    // Lưu vào Cache Storage với URL chuẩn
    const cache = await caches.open(AUDIO_CACHE_NAME);
    await cache.put(audioUrl, cachedResponse);

    onProgress?.(100);
    console.info(`[AudioCache] Đã lưu: ${audioUrl} (${(blob.size / 1024).toFixed(1)}KB)`);
    return { status: "cached", message: "Tải xuống hoàn tất!" };
  } catch (err: any) {
    console.error("[AudioCache] Lỗi tải xuống:", err);
    return {
      status: "error",
      message: err.message || "Không thể tải xuống. Vui lòng thử lại.",
    };
  }
}

/**
 * deleteAudioFromCache(poiId, lang, version)
 * Xóa một file audio khỏi cache (dành cho chức năng quản lý bộ nhớ tương lai).
 */
export async function deleteAudioFromCache(
  poiId: number,
  lang: string,
  version: number
): Promise<boolean> {
  if (!("caches" in window)) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    return await cache.delete(buildAudioUrl(poiId, lang, version));
  } catch {
    return false;
  }
}
