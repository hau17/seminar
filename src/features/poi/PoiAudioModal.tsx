import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Globe } from 'lucide-react';
import { POI } from '../../types';
import { useAudioGenerate } from '../../hooks/useAudioGenerate';
import { apiService } from '../../services/api';

interface PoiAudioModalProps {
  poi: POI;
  token: string | null;
  onClose: () => void;
}

export function PoiAudioModal({ poi, token, onClose }: PoiAudioModalProps) {
  const defaultLang = localStorage.getItem("user_lang") || (navigator.language.startsWith("vi") ? "vi" : "en");
  const [selectedLang, setSelectedLang] = useState(defaultLang);
  const [languages, setLanguages] = useState<{code: string, name: string}[]>([]);
  const [fetchingLangs, setFetchingLangs] = useState(true);

  useEffect(() => {
    localStorage.setItem("user_lang", selectedLang);
  }, [selectedLang]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const res = await apiService.get('/api/languages');
        if (res.ok) {
          const data = await res.json();
          setLanguages(data);
          
          if (data.length > 0 && !data.find((l: any) => l.code === defaultLang)) {
            setSelectedLang(data[0].code);
          }
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
  }, [defaultLang]);

  const { audioUrl, translatedName, translatedText, loading } = useAudioGenerate(poi, token, selectedLang);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/40">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
      >
        <div className="bg-emerald-50 px-5 py-4 border-b border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800">
            <Globe className="w-5 h-5" />
            <h3 className="font-bold text-lg">Ngôn ngữ & Audio</h3>
          </div>
          <button onClick={onClose} className="text-emerald-600 hover:text-emerald-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm font-medium text-slate-500 mb-1">Điểm tham quan:</p>
          <h4 className="font-bold text-slate-800 text-lg mb-4">{poi.name}</h4>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Chọn ngôn ngữ hiển thị & phát âm:</label>
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
            {loading ? (
              <div className="flex flex-col items-center justify-center py-6 text-emerald-600">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-200 border-t-emerald-600 mb-3" />
                <span className="text-sm font-medium animate-pulse">Đang xử lý dịch thuật và tạo âm thanh...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {selectedLang !== 'vi' && (translatedName || translatedText) && (
                  <div className="space-y-2">
                    {translatedName && (
                      <div>
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider block mb-1">Tên đã dịch:</span>
                        <p className="text-sm font-semibold text-slate-800">{translatedName}</p>
                      </div>
                    )}
                    {translatedText && (
                      <div>
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-1">Mô tả đã dịch:</span>
                        <p className="text-sm text-slate-700 leading-relaxed italic">{translatedText}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {audioUrl && (
                  <div className="pt-2">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider block mb-2">Audio Player:</span>
                    <audio controls autoPlay src={audioUrl} className="w-full h-10" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
