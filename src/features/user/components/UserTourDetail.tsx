import { Tour } from "../../../types";
import { X, Map, Trash2, Edit3, ChevronRight, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { POIWithDistance } from "../hooks/useUserGPS";
import { apiService } from "../../../services/api";

interface UserTourDetailProps {
  tour: Tour;
  onClose: () => void;
  setHighlightedTour: (tour: Tour | null) => void;
  setMapFocusPoi: (poi: any) => void;
  nearbyPOIs: POIWithDistance[];
  refreshData: () => void;
  onEdit: (tour: Tour) => void;
}

export function UserTourDetail({ 
  tour, 
  onClose, 
  setHighlightedTour, 
  setMapFocusPoi, 
  nearbyPOIs,
  refreshData,
  onEdit
}: UserTourDetailProps) {
  const navigate = useNavigate();

  const handleViewOnMap = () => {
    setHighlightedTour(tour);
    navigate("/user/map");
    onClose();
  };

  const handlePoiClick = (poiId: number) => {
    const poi = nearbyPOIs.find(p => p.id === poiId);
    if (poi) {
      setHighlightedTour(tour);
      setMapFocusPoi(poi);
      navigate("/user/map");
      onClose();
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa tour này?")) {
      try {
        const res = await apiService.delete(`/api/user/tours/${tour.id}`);
        if (!res.ok) throw new Error("Xóa thất bại");
        refreshData();
        onClose();
      } catch (err) {
        alert("Không thể xóa tour. Vui lòng thử lại.");
      }
    }
  };

  const handleEdit = () => {
    onEdit(tour);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all" onClick={onClose}>
      <div 
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl relative flex flex-col max-h-[80vh] overflow-hidden transform"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Simple & Clean (BR-17) */}
        <header className="p-6 pb-2 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-50 rounded-lg">
                <User size={20} className="text-blue-600" />
             </div>
             <h2 className="text-xl font-bold text-gray-800 truncate pr-4">{tour.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </header>

        {/* POI List Area */}
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-4">Lộ trình của tôi</h3>
          <div className="space-y-4">
            {tour.pois?.sort((a, b) => a.position - b.position).map((tp) => (
              <div 
                key={tp.poi_id}
                onClick={() => handlePoiClick(tp.poi_id)}
                className="group flex items-center gap-4 p-3 rounded-2xl border border-gray-100 bg-white hover:border-blue-100 hover:shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <div className="w-8 h-8 shrink-0 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all">
                  {tp.position}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-700 text-sm truncate">{tp.name}</h4>
                  <p className="text-[10px] text-gray-400 font-medium">Bấm để định vị trên bản đồ</p>
                </div>
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            ))}
          </div>
          
          {(!tour.pois || tour.pois.length === 0) && (
            <div className="flex flex-col items-center justify-center py-10 opacity-30">
               <Map size={48} className="text-gray-400 mb-2" />
               <p className="text-sm font-medium">Tour chưa có điểm POI nào.</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="p-6 bg-gray-50/50 backdrop-blur-md space-y-3">
          <button 
            onClick={handleViewOnMap}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
          >
            <Map size={18} />
            Xem trên bản đồ
          </button>
          
          <div className="grid grid-cols-2 gap-3">
             <button onClick={handleEdit} className="py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-sm active:bg-gray-50 border-b-2">
                <Edit3 size={16} className="text-blue-500" />
                Sửa tour
             </button>
             <button onClick={handleDelete} className="py-2.5 bg-white border border-gray-100 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 text-sm shadow-sm active:bg-red-50 border-b-2">
                <Trash2 size={16} />
                Xóa bỏ
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
