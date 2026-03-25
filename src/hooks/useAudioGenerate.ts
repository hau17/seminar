import { useState, useEffect } from 'react';
import { POI } from '../types';

interface UseAudioGenerateResult {
  audioUrl: string | null;
  translatedText: string | null;
  loading: boolean;
}

export function useAudioGenerate(poi: POI | null, token: string | null, selectedLang: string): UseAudioGenerateResult {
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [translatedText, setTranslatedText] = useState<string | null>(null);

  useEffect(() => {
    if (!poi || !token || !selectedLang) return;

    // 1. Kiểm tra cache dữ liệu (data POI hiện tại)
    const existingAudio = poi.audio_files?.find((a) => a.language_code === selectedLang);
    const existingTranslation = poi.translations?.find((t) => t.language_code === selectedLang);

    if (existingAudio && (selectedLang === 'vi' || existingTranslation)) {
      setAudioUrl(`${existingAudio.file_path}?v=${existingAudio.version}`);
      if (selectedLang !== 'vi' && existingTranslation) {
        setTranslatedText(existingTranslation.translated_description);
      } else {
        setTranslatedText(null);
      }
      return;
    }

    // 2. Nếu chưa có, tiến hành sinh Audio On-demand
    const fetchLanguageData = async () => {
      setLoading(true);
      setAudioUrl(null);
      setTranslatedText(null);

      try {
        const res = await fetch('/api/audio/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            poi_id: poi.id,
            language_code: selectedLang
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setAudioUrl(`${data.file_path}?v=${data.audio_version}`);
          if (selectedLang !== 'vi') {
            setTranslatedText(data.translated_description);
          }
        }
      } catch (err) {
        console.error('Lỗi khi Dịch/Sinh Audio:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLanguageData();
  }, [selectedLang, poi, token]);

  return { audioUrl, translatedText, loading };
}
