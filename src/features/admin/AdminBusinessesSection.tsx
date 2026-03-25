import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  ChevronLeft,
  Building2,
  Mail,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import { POI } from "../../types";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface Business {
  id: number;
  name: string;
  email: string;
  created_at: string;
  poi_count: number;
}

interface BusinessDetail extends Business {
  pois: POI[];
}

interface Props {
  authToken: string | null;
}

export const AdminBusinessesSection: React.FC<Props> = ({ authToken }) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selected, setSelected] = useState<BusinessDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${authToken}` };

  useEffect(() => {
    if (!authToken) return;
    setLoading(true);
    fetch("/api/admin/businesses", { headers })
      .then((r) => r.json())
      .then((data) => setBusinesses(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authToken]);

  const handleSelect = async (biz: Business) => {
    setLoadingDetail(true);
    setDeleteError(null);
    try {
      const r = await fetch(`/api/admin/businesses/${biz.id}`, { headers });
      const data = await r.json();
      setSelected(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleDeletePoi = async (poi: POI) => {
    if (!poi.id) return;
    if (!confirm(`Xóa POI "${poi.name}"?`)) return;
    setDeleteError(null);
    try {
      const r = await fetch(`/api/admin/pois/business/${poi.id}`, {
        method: "DELETE",
        headers,
      });
      const data = await r.json();
      if (r.status === 409) {
        setDeleteError(
          `Không thể xóa: POI đang nằm trong Tour: ${data.tours.map((t: any) => t.name).join(", ")}`
        );
        return;
      }
      if (!r.ok) { setDeleteError(data.error); return; }
      // Refresh detail
      await handleSelect({ ...selected! });
    } catch (e) {
      setDeleteError("Lỗi xóa POI");
    }
  };

  const filteredBusinesses = businesses.filter((b) =>
    b.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelected(null); setDeleteError(null); }}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div>
            <h2 className="font-bold text-base">{selected.name}</h2>
            <p className="text-xs text-slate-500">Chi tiết doanh nghiệp</p>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Mail className="w-4 h-4" /> {selected.email}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <Calendar className="w-4 h-4" />
            {new Date(selected.created_at).toLocaleDateString("vi-VN")}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4" /> {selected.poi_count ?? selected.pois?.length ?? 0} POIs
          </div>
        </div>

        {deleteError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
            {deleteError}
          </div>
        )}

        {/* POI list */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            POIs ({selected.pois?.length ?? 0})
          </h3>
          {loadingDetail ? (
            <LoadingSpinner />
          ) : !selected.pois?.length ? (
            <p className="text-sm text-slate-400 py-4 text-center">Chưa có POI nào</p>
          ) : (
            selected.pois.map((poi) => (
              <div
                key={poi.id}
                className="bg-white border border-slate-200 rounded-xl p-3 group"
              >
                <div className="flex items-start gap-3">
                  {poi.images?.[0] ? (
                    <img
                      src={poi.images[0].file_path}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                      alt=""
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate">{poi.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                      {poi.range_m ? ` · ${poi.range_m}m` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePoi(poi)}
                    className="p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="Xóa POI"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">
          Doanh nghiệp ({filteredBusinesses.length})
        </h3>
      </div>
      <input
        type="text"
        placeholder="🔍 Tìm doanh nghiệp..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
      />

      {loading ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="text-center py-10">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">
            {searchText ? "Không tìm thấy doanh nghiệp" : "Không có doanh nghiệp nào"}
          </p>
        </div>
      ) : (
        filteredBusinesses.map((biz) => (
          <motion.div
            key={biz.id}
            whileHover={{ y: -1 }}
            onClick={() => handleSelect(biz)}
            className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-emerald-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-sm text-slate-900">{biz.name}</h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {biz.email}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(biz.created_at).toLocaleDateString("vi-VN")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">{biz.poi_count}</p>
                <p className="text-[10px] text-slate-500">POIs</p>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </motion.div>
  );
};
