import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  MapPin,
  FileText,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { POI, POIStatus } from "../types";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { ToastContainer } from "../components/Toast";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PendingPOI extends POI {
  business_name: string;
  business_email: string;
}

interface AdminPendingPoisSectionProps {
  authToken: string | null;
}

export const AdminPendingPoisSection: React.FC<
  AdminPendingPoisSectionProps
> = ({ authToken }) => {
  const [pois, setPois] = useState<PendingPOI[]>([]);
  const [loadingPois, setLoadingPois] = useState(true);
  const [selectedPoi, setSelectedPoi] = useState<PendingPOI | null>(null);
  const [searchText, setSearchText] = useState("");
  const [operationLoading, setOperationLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type: "error" | "success" | "info" }>
  >([]);

  // ✅ v1.6: Toast notification helper
  const showToast = (
    message: string,
    type: "error" | "success" | "info" = "info",
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ✅ v1.6: Fetch all pending POIs from all businesses
  useEffect(() => {
    const fetchPendingPois = async () => {
      try {
        setLoadingPois(true);
        const response = await fetch("/api/admin/pois/pending", {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          setPois(data);
        } else {
          console.error("Failed to fetch pending POIs");
        }
      } catch (error) {
        console.error("Error fetching pending POIs:", error);
      } finally {
        setLoadingPois(false);
      }
    };

    if (authToken) {
      fetchPendingPois();
    }
  }, [authToken]);

  // ✅ v1.6: Approve POI - Change status from Pending → Approved, Trigger TTS
  const handleApprovePoi = async (poi: PendingPOI) => {
    try {
      setOperationLoading(true);
      const response = await fetch(`/api/pois/${poi.id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (response.ok) {
        showToast(`✅ Đã duyệt POI: ${poi.name}`, "success");
        // Remove approved POI from list
        setPois(pois.filter((p) => p.id !== poi.id));
        setSelectedPoi(null);
      } else {
        showToast("Lỗi khi duyệt POI", "error");
      }
    } catch (error) {
      console.error("Error approving POI:", error);
      showToast("Lỗi khi duyệt POI", "error");
    } finally {
      setOperationLoading(false);
    }
  };

  // ✅ v1.6: Reject POI - Change status from Pending → Rejected, Save reject reason
  const handleRejectPoi = async (poi: PendingPOI) => {
    if (!rejectReason.trim()) {
      showToast("Vui lòng nhập lý do từ chối", "error");
      return;
    }

    try {
      setOperationLoading(true);
      const response = await fetch(`/api/pois/${poi.id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ reject_reason: rejectReason.trim() }),
      });

      if (response.ok) {
        showToast(`❌ Đã từ chối POI: ${poi.name}`, "info");
        // Remove rejected POI from list
        setPois(pois.filter((p) => p.id !== poi.id));
        setSelectedPoi(null);
        setShowRejectDialog(false);
        setRejectReason("");
      } else {
        showToast("Lỗi khi từ chối POI", "error");
      }
    } catch (error) {
      console.error("Error rejecting POI:", error);
      showToast("Lỗi khi từ chối POI", "error");
    } finally {
      setOperationLoading(false);
    }
  };

  const filteredPois = pois.filter(
    (p) =>
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      p.business_name.toLowerCase().includes(searchText.toLowerCase()),
  );

  // ✅ v1.6: Main component render
  return (
    <>
      <AnimatePresence>
        {selectedPoi && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-50 flex items-end"
          >
            <motion.div
              initial={{ y: 400 }}
              animate={{ y: 0 }}
              exit={{ y: 400 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl ml-auto bg-white rounded-t-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selectedPoi.name}</h2>
                  <p className="text-xs text-slate-500">{selectedPoi.type}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedPoi(null);
                    setShowRejectDialog(false);
                    setRejectReason("");
                  }}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* POI Image */}
                {selectedPoi.image && (
                  <div className="rounded-xl overflow-hidden border border-slate-200">
                    <img
                      src={`/uploads/pois/${selectedPoi.image}`}
                      alt={selectedPoi.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}

                {/* POI Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase">
                      Loại
                    </label>
                    <p className="text-sm text-slate-900 mt-1">
                      {selectedPoi.type}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase">
                      Mô tả
                    </label>
                    <p className="text-sm text-slate-900 mt-1 leading-relaxed">
                      {selectedPoi.description || "Chưa có mô tả"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase">
                        Vĩ độ
                      </label>
                      <p className="text-sm text-slate-900 mt-1 font-mono">
                        {selectedPoi.lat.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase">
                        Kinh độ
                      </label>
                      <p className="text-sm text-slate-900 mt-1 font-mono">
                        {selectedPoi.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>

                  {selectedPoi.radius > 0 && (
                    <div>
                      <label className="text-xs font-bold text-slate-600 uppercase">
                        Bán kính
                      </label>
                      <p className="text-sm text-slate-900 mt-1">
                        {selectedPoi.radius} mét
                      </p>
                    </div>
                  )}
                </div>

                {/* Business Owner Info */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                  <h3 className="font-semibold text-sm text-slate-900">
                    📋 Thông tin doanh nghiệp
                  </h3>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase">
                      Tên công ty
                    </label>
                    <p className="text-sm text-slate-900 mt-1">
                      {selectedPoi.business_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase">
                      Email liên hệ
                    </label>
                    <p className="text-sm text-slate-900 mt-1 break-all">
                      {selectedPoi.business_email}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-700 uppercase">
                      Trạng thái
                    </p>
                    <p className="text-sm text-amber-900">
                      ⏳ Chờ duyệt từ quản trị viên
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <AnimatePresence>
                  {!showRejectDialog ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="grid grid-cols-2 gap-3"
                    >
                      <button
                        onClick={() => handleApprovePoi(selectedPoi)}
                        disabled={operationLoading}
                        className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                      >
                        {operationLoading ? (
                          <LoadingSpinner />
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Duyệt
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setShowRejectDialog(true)}
                        disabled={operationLoading}
                        className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white px-4 py-3 rounded-lg font-semibold transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                        Từ chối
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="space-y-3 bg-red-50 border border-red-200 rounded-lg p-4"
                    >
                      <label className="text-xs font-bold text-red-700 uppercase">
                        Lý do từ chối
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Nhập lý do từ chối POI này..."
                        className="w-full px-3 py-2 border border-red-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:border-red-500 text-sm h-24 resize-none"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            setShowRejectDialog(false);
                            setRejectReason("");
                          }}
                          disabled={operationLoading}
                          className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-semibold"
                        >
                          Hủy
                        </button>
                        <button
                          onClick={() => handleRejectPoi(selectedPoi)}
                          disabled={operationLoading || !rejectReason.trim()}
                          className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                        >
                          {operationLoading ? (
                            <LoadingSpinner />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                          Xác nhận từ chối
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={selectedPoi ? "hidden" : "space-y-4"}
      >
        {/* Search Header */}
        <div className="flex items-center justify-between px-2 mb-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
            📋 POIs chờ duyệt
          </h3>
          <span className="text-[10px] bg-amber-100 px-2 py-1 rounded-full text-amber-700 font-semibold">
            {loadingPois ? "..." : filteredPois.length}/{pois.length}
          </span>
        </div>

        <input
          type="text"
          placeholder="🔍 Tìm kiếm POI hoặc doanh nghiệp..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-sm"
        />

        {/* POIs List */}
        {loadingPois ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : filteredPois.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl">
            <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">
              {searchText
                ? "Không tìm thấy POI chờ duyệt"
                : "🎉 Không có POI chờ duyệt!"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredPois.map((poi) => (
              <motion.div
                key={poi.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                onClick={() => setSelectedPoi(poi)}
                className="cursor-pointer bg-white border-2 border-amber-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  {/* POI Image Thumbnail */}
                  <div className="flex-shrink-0">
                    {poi.image ? (
                      <img
                        src={`/uploads/pois/${poi.image}`}
                        alt={poi.name}
                        className="w-16 h-16 rounded-lg object-cover border border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* POI Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-sm text-slate-900 group-hover:text-amber-600 transition-colors">
                          {poi.name}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1">
                          {poi.type}
                        </p>
                      </div>
                      <span className="inline-block text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-semibold flex-shrink-0">
                        ⏳ Chờ
                      </span>
                    </div>

                    {/* Business Owner */}
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <p className="text-xs text-slate-600">
                        <span className="font-semibold">Doanh nghiệp:</span>{" "}
                        {poi.business_name}
                      </p>
                    </div>

                    {/* Description Preview */}
                    {poi.description && (
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                        {poi.description}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
};
