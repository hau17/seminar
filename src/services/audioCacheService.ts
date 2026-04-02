/**
 * audioCacheService.ts
 *
 * Cache Manager + Session Init + Download Audio
 * ─────────────────────────────────────────────
 * Chiến lược lưu trữ: Browser Cache API (Cache Storage)
 * Convention URL: /uploads/audio/poi_{id}_{lang}_v{version}.mp3
 *
 * VERSION TRACKING — Tại sao dùng localStorage song song với Cache API?
 * ─────────────────────────────────────────────────────────────────────
 * Cache API chỉ lưu file binary. URL encoding version (v{n}) là cách duy nhất
 * để biết version, nhưng nó không phân biệt được:
 *   - File được user chủ động tải xuống (intentional download)
 *   - File được hệ thống tự preload ngầm (không intentional)
 *
 * Vì vậy, sau khi user BẤM NÚT "Tải xuống" thành công, chúng ta lưu kèm
 * vào localStorage: key = `audio_v_poi_{id}_{lang}`, value = version (number).
 * Session Init đọc localStorage này để biết đây là file đã được xác nhận tải.
 * Nếu không có key trong localStorage → file trong cache là preload ngầm → bỏ qua an toàn.
 *
 * PRD §7.2, §8.3: Session Init CHỈ được sync version + dịch text.
 *                 KHÔNG được tải file audio.
 * PRD §7.4.2:     Nếu local_version < server_version → xóa cache bắt buộc.
 * PRD §12.6:      Kiểm tra dung lượng thiết bị trước khi tải.
 */

import { POI } from "../types";

export const AUDIO_CACHE_NAME = "audio-cache-v1";

/** Ngưỡng dung lượng tối thiểu cần trống để cho phép tải (Mục 12.6 PRD) */
const MIN_FREE_STORAGE_MB = 50;

// ─── VERSION TRACKING (localStorage) ─────────────────────────────────────────

/**
 * Key localStorage lưu version đã xác nhận tải của một file audio.
 * Convention: audio_v_poi_{poiId}_{lang}
 * Value: số nguyên (version number, ví dụ: "1", "2")
 */
export function getVersionKey(poiId: number, lang: string): string {
  return `audio_v_poi_${poiId}_${lang}`;
}

/**
 * Đọc local_version đã xác nhận của một file audio từ localStorage.
 * Trả về null nếu chưa từng tải (chưa có key → không phải intentional download).
 */
export function getLocalVersion(poiId: number, lang: string): number | null {
  const raw = localStorage.getItem(getVersionKey(poiId, lang));
  if (raw === null) return null;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Lưu local_version sau khi tải xuống thành công.
 * BẮT BUỘC gọi sau khi cache.put() hoàn tất (PRD §7.4.2).
 */
export function saveLocalVersion(poiId: number, lang: string, version: number): void {
  localStorage.setItem(getVersionKey(poiId, lang), String(version));
  console.info(`[AudioCache] Đã lưu version: POI#${poiId} [${lang}] = v${version}`);
}

/**
 * Xóa local_version khi user xóa file khỏi cache.
 */
export function clearLocalVersion(poiId: number, lang: string): void {
  localStorage.removeItem(getVersionKey(poiId, lang));
}

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

// ─── SESSION INIT — Đồng bộ phiên bản cache ──────────────────────────────────

/**
 * syncAudioCache(serverPois)
 *
 * Được gọi một lần duy nhất khi khởi động app (Session Init).
 * Chức năng ĐÚNG theo PRD §7.2, §8.3, §7.4.2:
 *   ✅ Quét Cache Storage để tìm file đã tải.
 *   ✅ So sánh local_version (từ localStorage) với server_version.
 *   ✅ Nếu local < server → xóa cache + xóa localStorage key (BẮT BUỘC).
 *   ✅ Nếu local === server → GIỮ NGUYÊN, tuyệt đối không xóa.
 *   ❌ KHÔNG tải file audio nào. KHÔNG fetch stream URL.
 *
 * Logic phân biệt "intentional download" vs "preload ngầm":
 *   - Nếu URL có trong Cache nhưng KHÔNG có key tương ứng trong localStorage
 *     → đây là file preload ngầm (từ GPS trigger) hoặc file rác.
 *     → XÓA để tránh chiếm bộ nhớ và tránh version mismatch.
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

    // Build lookup map: `${poiId}_${lang}` → server_version
    const serverVersionMap = new Map<string, number>();
    for (const poi of serverPois) {
      if (!poi.id || !poi.audio_files) continue;
      for (const af of poi.audio_files) {
        serverVersionMap.set(`${poi.id}_${af.language_code}`, af.version);
      }
    }

    let deletedCount = 0;
    let keptCount = 0;

    for (const request of cachedRequests) {
      const parsed = parseAudioUrl(request.url);
      if (!parsed) {
        // URL không đúng format → xóa file rác
        await cache.delete(request);
        deletedCount++;
        continue;
      }

      const { poiId, lang } = parsed;
      const serverVersion = serverVersionMap.get(`${poiId}_${lang}`);

      // ── Kiểm tra đây có phải intentional download không ──
      // Intentional download = user đã bấm nút "Tải xuống" → có key trong localStorage
      const localVersion = getLocalVersion(poiId, lang);

      if (localVersion === null) {
        // Không có key localStorage → đây là file preload ngầm hoặc file rác
        // → Xóa để dọn dẹp (PRD §8.3: Session Init không được giữ file preload ngầm)
        console.log(
          `[AudioCache] Xóa preload ngầm (không có localStorage key): POI#${poiId} [${lang}]`
        );
        await cache.delete(request);
        deletedCount++;
        continue;
      }

      // Có key localStorage → intentional download → kiểm tra version
      if (serverVersion === undefined) {
        // POI không còn tồn tại trên server → dọn dẹp
        console.log(`[AudioCache] Xóa file POI đã bị xóa khỏi server: POI#${poiId}`);
        await cache.delete(request);
        clearLocalVersion(poiId, lang);
        deletedCount++;
        continue;
      }

      if (localVersion < serverVersion) {
        // ✅ local < server → xóa bản cũ BẮT BUỘC (PRD §7.4.2)
        console.log(
          `[AudioCache] ✓ Xóa cache lỗi thời: POI#${poiId} [${lang}] local=v${localVersion} < server=v${serverVersion}`
        );
        await cache.delete(request);
        clearLocalVersion(poiId, lang);
        deletedCount++;
      } else {
        // ✅ local === server (hoặc local > server, không thể xảy ra) → GIỮ NGUYÊN
        // TUYỆT ĐỐI không xóa file hợp lệ
        console.info(
          `[AudioCache] ✓ Giữ cache hợp lệ: POI#${poiId} [${lang}] v${localVersion} (server=v${serverVersion})`
        );
        keptCount++;
      }
    }

    console.info(
      `[AudioCache] Session Init hoàn tất. Xóa: ${deletedCount} | Giữ: ${keptCount} file.`
    );
  } catch (err) {
    console.error("[AudioCache] Lỗi không thể phục hồi trong Session Init:", err);
  }
}

// ─── KIỂM TRA CACHE ──────────────────────────────────────────────────────────

/**
 * isAudioCached(poiId, lang, version)
 *
 * Kiểm tra xem file audio của một POI đã được cache chưa.
 * Dùng bởi UI để quyết định hiển thị nút "Đã tải" hay "Tải xuống".
 *
 * Chú ý: Chỉ trả về true nếu có cả Cache entry VÀ localStorage version key
 * (tức là user đã intentionally tải xuống).
 */
export async function isAudioCached(
  poiId: number,
  lang: string,
  version: number
): Promise<boolean> {
  if (!("caches" in window)) return false;
  try {
    // Kiểm tra localStorage key trước (nhanh hơn, không async)
    const localVersion = getLocalVersion(poiId, lang);
    if (localVersion === null) return false; // Chưa từng tải chủ động

    // Kiểm tra file thực sự còn trong cache không
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

// ─── DOWNLOAD & STORAGE CHECK ─────────────────────────────────────────────────

/**
 * Kiểm tra dung lượng thiết bị (PRD §12.6).
 * Dùng Storage Manager API nếu có, fallback về "luôn đủ" cho browser cũ.
 */
export async function checkStorageQuota(): Promise<{
  hasSufficientSpace: boolean;
  freeMB: number | null;
}> {
  if (!navigator.storage?.estimate) {
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
 * Xử lý nút "Tải xuống" (Intentional Download):
 * 1. Kiểm tra dung lượng thiết bị (PRD §12.6).
 * 2. Tải file từ server stream URL.
 * 3. Lưu vào Cache API.
 * 4. ⬅️ BẮT BUỘC: Lưu local_version vào localStorage (FIX BUG RESTART).
 * 5. Trả về kết quả để UI cập nhật trạng thái.
 *
 * Tại sao bước 4 quan trọng?
 * Nếu không lưu localStorage key, Session Init sẽ không phân biệt được file này
 * với preload ngầm → xóa nhầm khi restart app.
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

    // ── Bước 3: Lưu vào Cache Storage ──
    const cache = await caches.open(AUDIO_CACHE_NAME);
    await cache.put(audioUrl, cachedResponse);

    // ── Bước 4: Lưu local_version vào localStorage (BẮT BUỘC - FIX BUG RESTART) ──
    // Phải làm SAU khi cache.put() thành công để đảm bảo tính nhất quán.
    // Session Init đọc key này để phân biệt intentional download với preload ngầm.
    saveLocalVersion(poiId, lang, version);

    onProgress?.(100);
    console.info(`[AudioCache] ✓ Đã lưu: ${audioUrl} (${(blob.size / 1024).toFixed(1)}KB)`);
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
 *
 * Xóa một file audio khỏi cache.
 * ⬅️ BẮT BUỘC xóa cả localStorage key để Session Init không nhầm trạng thái.
 */
export async function deleteAudioFromCache(
  poiId: number,
  lang: string,
  version: number
): Promise<boolean> {
  if (!("caches" in window)) return false;
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME);
    const deleted = await cache.delete(buildAudioUrl(poiId, lang, version));
    if (deleted) {
      // Xóa localStorage key để Session Init không bị nhầm
      clearLocalVersion(poiId, lang);
    }
    return deleted;
  } catch {
    return false;
  }
}
