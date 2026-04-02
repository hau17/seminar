import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Globe, Loader2 } from 'lucide-react';
import { Tour } from '../../types';
import { useTourTranslation } from '../../hooks/useTourTranslation';
import { apiService } from '../../services/api';

interface AdminTourTranslationModalProps {
  tour: Tour;
  token: string | null;
  onClose: () => void;
}

export function AdminTourTranslationModal({ tour, token, onClose }: AdminTourTranslationModalProps) {
  const [selectedLang, setSelectedLang] = useState('vi');
  const [languages, setLanguages] = useState<{code: string, name: string}[]>([]);
  const [fetchingLangs, setFetchingLangs] = useState(true);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await apiService.get('/api/languages');
        if (res.ok) {
          const data = await res.json();
          setLanguages(data);
        } else {
          setLanguages([{ code: "vi", name: "Tiếng Việt" }, { code: "en", name: "English" }]);
        }
      } catch (error) {
        setLanguages([{ code: "vi", name: "Tiếng Việt" }, { code: "en", name: "English" }]);
      } finally {
        setFetchingLangs(false);
      }
    };
    fetchLanguages();
  }, []);

  const { translatedName, translatedDescription, loading } = useTourTranslation(tour, token, selectedLang);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="bg-emerald-50 px-5 py-4 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800">
            <Globe className="w-5 h-5" />
            <h3 className="font-bold text-lg">Dịch thuật Tour</h3>
          </div>
          <button onClick={onClose} className="text-emerald-600 hover:text-emerald-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm font-medium text-slate-500 mb-1">Tour:</p>
          <h4 className="font-bold text-slate-800 text-lg mb-4">{tour.name}</h4>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Chọn ngôn ngữ hiển thị:</label>
            <select 
              className="w-full border border-slate-200 p-2.5 rounded-lg text-sm focus:outline-none focus:border-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-slate-50"
              value={selectedLang} 
              onChange={(e) => setSelectedLang(e.target.value)}
              disabled={loading || fetchingLangs}
            >
              {fetchingLangs ? (
                <option value={selectedLang}>Đang tải...</option>
              ) : (
                languages.map(l => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))
              )}
            </select>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 min-h-[120px]">
             {selectedLang === 'vi' ? (
                <div className="flex items-center justify-center h-full py-8 text-slate-400 italic text-sm">
                   Chưa chọn ngoại ngữ để xem bản dịch.
                </div>
             ) : loading ? (
              <div className="flex flex-col items-center justify-center py-6 text-emerald-600">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-emerald-600" />
                <span className="text-sm font-medium animate-pulse">Đang dịch...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                    <div>
                      <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Tên đã dịch:</span>
                      <p className="text-sm font-semibold text-slate-800">{translatedName || tour.name}</p>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">Mô tả đã dịch:</span>
                      <p className="text-sm text-slate-700 leading-relaxed italic">{translatedDescription || tour.description || "Không có mô tả."}</p>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
