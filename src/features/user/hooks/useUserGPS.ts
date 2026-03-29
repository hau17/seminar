import { useState, useEffect, useMemo } from "react";
import { POI, Tour } from "../../../types";
import { calculateDistance } from "../../../utils/distance";

export interface POIWithDistance extends POI {
  distance?: number; // distance in meters, optional if GPS not found
}

export function useUserGPS(pois: POI[] = [], tours: Tour[] = []) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // 1. Theo dõi GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Trình duyệt không hỗ trợ định vị GPS.");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setGpsError(null);
      },
      (err) => {
        // Chỉ hiện lỗi nếu chưa bao giờ lấy được GPS và có lỗi thực sự
        setGpsError(`Lỗi GPS: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 2. Logic Lọc POI (Độc lập 20km)
  const filteredPois = useMemo(() => {
    // Nếu chưa có GPS, trả về toàn bộ danh sách (không lọc) để tránh trắng màn hình theo PRD v1.8
    if (!userLocation) return pois as POIWithDistance[];

    return pois
      .map((poi) => ({
        ...poi,
        distance: calculateDistance(userLocation.lat, userLocation.lng, poi.lat, poi.lng),
      }))
      // CHỈ GIỮ LẠI POI TRONG BÁN KÍNH 20KM (20,000m)
      .filter((poi) => poi.distance <= 20000)
      .sort((a, b) => (a.distance || 0) - (b.distance || 0));
  }, [pois, userLocation]);

  // 3. Logic Lọc TOUR (Có ít nhất 1 POI trong 20km)
  const filteredTours = useMemo(() => {
    // Nếu chưa có GPS, trả về toàn bộ danh sách Tours
    if (!userLocation) return tours;

    return tours.filter((tour) => {
      // Một Tour được giữ lại hiển thị NẾU VÀ CHỈ NẾU nó có ít nhất 1 POI <= 20000m
      // Chúng ta dùng mảng poi_ids (từ Tour metadata) để đối soát với filteredPois đã tính ở trên
      return tour.poi_ids?.some((pId) => 
        filteredPois.some((fp) => fp.id === pId)
      );
    });
  }, [tours, filteredPois, userLocation]);

  const requestPermission = () => {
    navigator.geolocation.getCurrentPosition(
      () => setGpsError(null),
      (err) => setGpsError(`Lỗi GPS: ${err.message}`)
    );
  };

  return { 
    userLocation, 
    nearbyPOIs: filteredPois, 
    nearbyTours: filteredTours, 
    gpsError, 
    requestPermission 
  };
}
