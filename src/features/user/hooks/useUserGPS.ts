import { useState, useEffect } from "react";
import { POI } from "../../../types";
import { calculateDistance } from "../../../utils/distance";

export interface POIWithDistance extends POI {
  distance: number; // distance in meters
}

export function useUserGPS(pois: POI[] = []) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyPOIs, setNearbyPOIs] = useState<POIWithDistance[]>([]);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Recalculate distances whenever GPS updates
        if (pois && pois.length > 0) {
          const mapped = pois
            .map((poi) => ({
              ...poi,
              distance: calculateDistance(latitude, longitude, poi.lat, poi.lng),
            }))
            .sort((a, b) => a.distance - b.distance);
          setNearbyPOIs(mapped);
        }
      },
      (err) => {
        setGpsError(`Lỗi GPS: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [pois]);

  const requestPermission = () => {
    navigator.geolocation.getCurrentPosition(
      () => setGpsError(null),
      (err) => setGpsError(`Lỗi GPS: ${err.message}`)
    );
  };

  return { userLocation, nearbyPOIs, gpsError, requestPermission };
}
