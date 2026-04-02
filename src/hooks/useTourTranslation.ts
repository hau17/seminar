import { useState, useEffect } from 'react';
import { Tour } from '../types';

export function useTourTranslation(tour: Tour, token: string | null, selectedLang: string) {
  const [translatedName, setTranslatedName] = useState<string | null>(null);
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tour.id || !selectedLang || selectedLang === 'vi') {
      setTranslatedName(null);
      setTranslatedDescription(null);
      setLoading(false);
      return;
    }

    const fetchTranslation = async () => {
      // 1. Check local cache (tour.translations array from GET)
      const existing = tour.translations?.find(t => t.language_code === selectedLang);
      if (existing) {
        setTranslatedName(existing.translated_name);
        setTranslatedDescription(existing.translated_description);
        setLoading(false);
        return;
      }

      // 2. Not in cache, call on-demand API
      setLoading(true);
      try {
        const res = await fetch("/api/tours/translate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ tour_id: tour.id, language_code: selectedLang }),
        });
        
        if (res.ok) {
          const data = await res.json();
          setTranslatedName(data.translated_name);
          setTranslatedDescription(data.translated_description);
        }
      } catch (err) {
        console.error("Failed to translate tour:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslation();
  }, [tour.id, tour.translations, selectedLang, token]);

  return { translatedName, translatedDescription, loading };
}
