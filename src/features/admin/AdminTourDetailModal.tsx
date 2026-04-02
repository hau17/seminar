import React, { useState } from "react";
import { X, Globe, Navigation } from "lucide-react";
import { Tour } from "../../types";
import { AdminTourTranslationModal } from "./AdminTourTranslationModal";
import { AnimatePresence } from "motion/react";

interface Props {
  tour: Tour;
  token: string | null;
  onClose: () => void;
}

export function AdminTourDetailModal({ tour, token, onClose }: Props) {
  const [showTranslationModal, setShowTranslationModal] = useState(false);
  const bannerImg = tour.images?.[0]?.file_path || null;

  return (
    <>
      <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="relative h-40 bg-slate-200 shrink-0">
             {bannerImg ? <img src={bannerImg} alt="" className="w-full h-full object-cover" /> : 
               <div className="w-full h-full flex items-center justify-center text-slate-400"><Navigation size={40}/></div>}
             <button onClick={onClose} className="absolute top-2 right-2 bg-white/70 p-1.5 rounded-full z-10 hover:bg-white transition-colors"><X size={16}/></button>
          </div>

          <div className="p-5 overflow-y-auto max-h-[50vh]">
             <h2 className="text-xl font-bold text-slate-800 mb-2">{tour.name}</h2>
             <p className="text-sm text-slate-500 whitespace-pre-line mb-4">
                {tour.description || "Không có mô tả."}
             </p>

             <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">POIs Trong Tour ({tour.pois?.length || 0})</h4>
             <div className="space-y-2 mb-6">
               {(tour.pois || []).map(p => (
                   <div key={p.poi_id} className="text-sm text-slate-700 bg-slate-50 border border-slate-100 p-2.5 rounded-xl flex items-center gap-3">
                      <span className="w-6 h-6 flex items-center justify-center bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full shrink-0">{p.position}</span>
                      <span className="truncate">{p.name}</span>
                   </div>
               ))}
             </div>

             <button
               onClick={() => setShowTranslationModal(true)}
               className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 font-bold text-sm py-3 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-100"
             >
               <Globe className="w-4 h-4" /> Ngôn ngữ
             </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showTranslationModal && (
          <AdminTourTranslationModal
             tour={tour}
             token={token}
             onClose={() => setShowTranslationModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
