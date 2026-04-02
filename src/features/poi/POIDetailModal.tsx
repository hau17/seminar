import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit2, Trash2, Globe } from 'lucide-react';
import { POI, POIImage } from '../../types';
import { PoiAudioModal } from './PoiAudioModal';

interface POIDetailModalProps {
  poi: POI;
  token: string | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}


function ImageGrid({ images }: { images?: POIImage[] }) {
  if (!images?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {images.map((img) => (
        <img
          key={img.id}
          src={img.file_path}
          className="h-24 w-auto rounded object-cover border border-slate-200"
          alt=""
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      ))}
    </div>
  );
}

export function POIDetailModal({ poi, token, onClose, onEdit, onDelete }: POIDetailModalProps) {
  const [showAudioModal, setShowAudioModal] = useState(false);
console.log("🔥 ALO ALO! FILE POIDetailModal ĐANG CHẠY RỒI NÈ! POI đang xem:", poi.name);
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 30 }}
        className="absolute top-4 right-4 w-96 bg-white rounded-2xl shadow-xl border border-slate-100 z-[1000] max-h-[90vh] overflow-y-auto"
      >
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-bold text-lg">{poi.name}</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded mb-3 border border-slate-100">{poi.description}</p>
          
          <div className="text-xs text-slate-500 space-y-1 mb-3">
            <div>📍 {poi.lat.toFixed(6)}, {poi.lng.toFixed(6)}</div>
            <div>📏 Phạm vi: {poi.range_m}m</div>
            <div>👤 {poi.owner_type === 'admin' ? 'Admin' : 'Doanh nghiệp'}</div>
          </div>
          <ImageGrid images={poi.images} />

          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setShowAudioModal(true)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 text-blue-600 font-semibold text-sm py-2 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Globe className="w-4 h-4" /> Ngôn ngữ & Audio
            </button>
                        
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 flex items-center justify-center gap-1.5 bg-emerald-500 text-white text-sm py-2 rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Sửa
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-4 flex items-center justify-center gap-1.5 bg-red-50 text-red-500 text-sm py-2 rounded-lg hover:bg-red-100 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa
              </button>
            )}
          </div>
        </div>
      </motion.div>
      
      {/* Render PoiAudioModal bên ngoài POIDetailModal */}
      <AnimatePresence>
        {showAudioModal && (
          <PoiAudioModal
            poi={poi}
            token={token}
            onClose={() => setShowAudioModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}