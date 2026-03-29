import { useState, useMemo } from "react";
import { X, Search, MapPin, Check, Save, Loader2 } from "lucide-react";
import { apiService } from "../../../services/api";
import { Tour, POI } from "../../../types";

interface UserTourFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Tour | null;
  allPois: POI[];
  onSuccess: () => void;
}

export function UserTourFormModal({ 
  isOpen, 
  onClose, 
  initialData, 
  allPois, 
  onSuccess 
}: UserTourFormModalProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [selectedPois, setSelectedPois] = useState<POI[]>(() => {
    if (!initialData?.poi_ids) return [];
    // Sort initially by position
    const sortedIds = [...(initialData.pois || [])]
      .sort((a, b) => a.position - b.position)
      .map(p => p.poi_id);
    
    return sortedIds
       .map(id => allPois.find(p => p.id === id))
       .filter((p): p is POI => !!p);
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPois = useMemo(() => {
    if (!search.trim()) return allPois;
    const s = search.toLowerCase();
    return allPois.filter(p => p.name.toLowerCase().includes(s));
  }, [allPois, search]);

  const togglePoi = (poi: POI) => {
    const index = selectedPois.findIndex(p => p.id === poi.id);
    if (index > -1) {
      // Remove POI - others shift up automatically in the array
      setSelectedPois(selectedPois.filter(p => p.id !== poi.id));
    } else {
      // Add POI to end
      setSelectedPois([...selectedPois, poi]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên tour");
      return;
    }
    if (selectedPois.length === 0) {
      setError("Vui lòng chọn ít nhất 1 điểm tham quan");
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      name: name.trim(),
      poi_ids: selectedPois.map(p => p.id)
    };

    try {
      const res = initialData 
        ? await apiService.put(`/api/user/tours/${initialData.id}`, payload)
        : await apiService.post("/api/user/tours", payload);

      if (!res.ok) throw new Error("Thao tác thất bại");
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Đã có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
      <div 
        className="w-full max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="p-6 pb-4 flex items-center justify-between border-b border-gray-50">
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-tight">
              {initialData ? "Cập nhật Tour" : "Tạo Lộ trình mới"}
            </h2>
            <p className="text-xs text-gray-400 font-medium mt-0.5">Tiêu chuẩn BR-17 (Hội Hội An)</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Tên Tour (Bắt buộc)</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Hội An 1 ngày, Tour đêm..."
                className="w-full px-5 py-4 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all font-bold text-gray-800"
              />
            </div>

            {/* POI Picker */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Chọn điểm tham quan</label>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Đã chọn {selectedPois.length} điểm
                </span>
              </div>

              {/* Search */}
              <div className="relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm điểm đến..."
                  className="w-full pl-12 pr-5 py-3.5 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-blue-500 outline-none transition-all text-sm font-medium"
                />
              </div>

              {/* POI List */}
              <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {filteredPois.map((poi) => {
                  const order = selectedPois.findIndex(p => p.id === poi.id) + 1;
                  const isSelected = order > 0;

                  return (
                    <div 
                      key={poi.id}
                      onClick={() => togglePoi(poi)}
                      className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98] ${
                        isSelected 
                          ? "bg-blue-50 border-blue-200 ring-1 ring-blue-100" 
                          : "bg-white border-gray-100 hover:border-gray-200"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${
                        isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-gray-100 text-gray-400"
                      }`}>
                        {isSelected ? order : <MapPin size={18} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 text-sm truncate">{poi.name}</h4>
                        <p className="text-[10px] text-gray-400 font-medium">{Math.round((poi as any).distance || 0)}m gần bạn</p>
                      </div>
                      {isSelected && <Check size={18} className="text-blue-600 mr-2" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Sequence Preview */}
            {selectedPois.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-200">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Lộ trình dự kiến</p>
                <div className="flex flex-wrap gap-2 items-center">
                   {selectedPois.map((p, i) => (
                     <span key={p.id} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">{p.name}</span>
                        {i < selectedPois.length - 1 && <span className="text-gray-300 text-xs">→</span>}
                     </span>
                   ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <footer className="p-6 bg-gray-50/80 backdrop-blur-sm border-t border-gray-100 space-y-3">
            {error && <p className="text-xs text-red-500 font-bold text-center animate-bounce">{error}</p>}
            
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <><Save size={20} /> {initialData ? "Lưu thay đổi" : "Tạo lộ trình"}</>
              )}
            </button>
            <p className="text-[10px] text-gray-400 text-center font-medium">Bạn có thể thay đổi lộ trình này bất cứ lúc nào</p>
          </footer>
        </form>
      </div>
    </div>
  );
}
