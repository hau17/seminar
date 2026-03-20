import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  Building2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Image as ImageIcon,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { POI } from "../types";
import { LoadingSpinner } from "../components/LoadingSpinner";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Business {
  id: number;
  company_name: string;
  email: string;
  phone: string;
  created_at: string;
  poi_pending: number;
  poi_approved: number;
  poi_rejected: number;
  poi_total: number;
}

interface AdminBusinessesSectionProps {
  authToken: string | null;
}

export const AdminBusinessesSection: React.FC<AdminBusinessesSectionProps> = ({
  authToken,
}) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null,
  );
  const [businessPois, setBusinessPois] = useState<POI[]>([]);
  const [loadingPois, setLoadingPois] = useState(false);

  // ✅ v1.6: Fetch all businesses with POI stats
  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        setLoadingBusinesses(true);
        const response = await fetch("/api/admin/businesses", {
          headers: { Authorization: `Bearer ${authToken}` },
        });

        if (response.ok) {
          const data = await response.json();
          setBusinesses(data);
        } else {
          console.error("Failed to fetch businesses");
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
      } finally {
        setLoadingBusinesses(false);
      }
    };

    if (authToken) {
      fetchBusinesses();
    }
  }, [authToken]);

  // ✅ v1.6: Fetch approved POIs for selected business
  const handleBusinessSelect = async (business: Business) => {
    setSelectedBusiness(business);
    try {
      setLoadingPois(true);
      const response = await fetch(
        `/api/admin/businesses/${business.id}/pois`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setBusinessPois(data);
      } else {
        setBusinessPois([]);
      }
    } catch (error) {
      console.error("Error fetching business POIs:", error);
      setBusinessPois([]);
    } finally {
      setLoadingPois(false);
    }
  };

  const filteredBusinesses = businesses.filter((b) =>
    b.company_name.toLowerCase().includes(searchText.toLowerCase()),
  );

  // ✅ v1.6: Business Detail View
  if (selectedBusiness) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelectedBusiness(null)}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-xl font-bold">
              {selectedBusiness.company_name}
            </h2>
            <p className="text-xs text-slate-500">Chi tiết doanh nghiệp</p>
          </div>
        </div>

        {/* Business Info Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-600 uppercase">
                  Email
                </span>
              </div>
              <p className="text-sm font-medium text-slate-900 break-all">
                {selectedBusiness.email}
              </p>
            </div>

            {/* Phone */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-600 uppercase">
                  Điện thoại
                </span>
              </div>
              <p className="text-sm font-medium text-slate-900">
                {selectedBusiness.phone || "N/A"}
              </p>
            </div>

            {/* Created Date */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-600 uppercase">
                  Ngày đăng ký
                </span>
              </div>
              <p className="text-sm font-medium text-slate-900">
                {new Date(selectedBusiness.created_at).toLocaleDateString(
                  "vi-VN",
                )}
              </p>
            </div>

            {/* Total POIs */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-600 uppercase">
                  Tổng POIs
                </span>
              </div>
              <p className="text-sm font-medium text-slate-900">
                {selectedBusiness.poi_total}
              </p>
            </div>
          </div>

          {/* POI Stats */}
          <div className="pt-4 border-t border-emerald-200">
            <p className="text-xs font-semibold text-slate-600 uppercase mb-3">
              Thống kê POIs
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {selectedBusiness.poi_pending}
                </p>
                <p className="text-xs text-slate-600 mt-1">Chờ duyệt</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {selectedBusiness.poi_approved}
                </p>
                <p className="text-xs text-slate-600 mt-1">Đã duyệt</p>
              </div>
              <div className="bg-white/60 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {selectedBusiness.poi_rejected}
                </p>
                <p className="text-xs text-slate-600 mt-1">Bị trả về</p>
              </div>
            </div>
          </div>
        </div>

        {/* Approved POIs Section */}
        <div className="space-y-3 mt-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
              ✅ POIs Đã Duyệt
            </h3>
            <span className="text-[10px] bg-green-100 px-2 py-1 rounded-full text-green-700 font-medium">
              {businessPois.length}
            </span>
          </div>

          {loadingPois ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : businessPois.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500">Không có POI đã duyệt</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {businessPois.map((poi) => (
                <motion.div
                  key={poi.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white border border-green-200 rounded-xl p-4 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* POI Image Thumbnail */}
                    <div className="flex-shrink-0">
                      {poi.image ? (
                        <img
                          src={`/uploads/pois/${poi.image}`}
                          alt={poi.name}
                          className="w-12 h-12 rounded-lg object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* POI Info */}
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm text-slate-900">
                        {poi.name}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1">{poi.type}</p>
                      {poi.description && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                          {poi.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <span className="inline-block text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          ✅ Đã duyệt
                        </span>
                        {poi.radius > 0 && (
                          <span className="inline-block text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                            {poi.radius}m
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ✅ v1.6: Business List View
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="space-y-4"
    >
      {/* Search */}
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">
          Danh sách Doanh Nghiệp
        </h3>
        <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-full text-slate-600">
          {loadingBusinesses ? "..." : filteredBusinesses.length}/
          {businesses.length}
        </span>
      </div>

      <input
        type="text"
        placeholder="🔍 Tìm kiếm doanh nghiệp..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-sm"
      />

      {/* Business Cards */}
      {loadingBusinesses ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : filteredBusinesses.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            {searchText
              ? "Không tìm thấy doanh nghiệp"
              : "Không có doanh nghiệp nào"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredBusinesses.map((business) => (
            <motion.div
              key={business.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              onClick={() => handleBusinessSelect(business)}
              className="cursor-pointer bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                {/* Business Info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm text-slate-900 group-hover:text-emerald-600 transition-colors">
                    {business.company_name}
                  </h3>
                  <div className="space-y-1 mt-2">
                    <p className="text-xs text-slate-600 flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {business.email}
                    </p>
                    {business.phone && (
                      <p className="text-xs text-slate-600 flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        {business.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* POI Stats Badge */}
                <div className="flex-shrink-0 text-right">
                  <div className="inline-block text-center">
                    <p className="text-2xl font-bold text-emerald-600">
                      {business.poi_total}
                    </p>
                    <p className="text-[10px] text-slate-600 font-semibold">
                      POIs
                    </p>
                  </div>
                </div>
              </div>

              {/* Stat Indicators */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200">
                <div className="flex-1 text-center">
                  <p className="text-xs font-bold text-amber-600">
                    {business.poi_pending}
                  </p>
                  <p className="text-[10px] text-slate-500">Chờ</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-xs font-bold text-green-600">
                    {business.poi_approved}
                  </p>
                  <p className="text-[10px] text-slate-500">Duyệt</p>
                </div>
                <div className="flex-1 text-center">
                  <p className="text-xs font-bold text-red-600">
                    {business.poi_rejected}
                  </p>
                  <p className="text-[10px] text-slate-500">Trả</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
