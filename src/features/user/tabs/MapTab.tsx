import { useOutletContext } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { POIWithDistance } from "../hooks/useUserGPS";
import { UserPoiModal } from "../components/UserPoiModal";
import { useState } from "react";

// Marker icon cho POI
const poiIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Marker icon cho User (Vị trí hiện tại)
const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface GlobalContext {
  userLocation: { lat: number; lng: number } | null;
  nearbyPOIs: POIWithDistance[];
  currentAudioPoi: POIWithDistance | null;
  isPlaying: boolean;
  requestPermission: () => void;
}

export function MapTab() {
  const { userLocation, nearbyPOIs, requestPermission } = useOutletContext<GlobalContext>();
  const [selectedPoi, setSelectedPoi] = useState<POIWithDistance | null>(null);

  // Mặc định HCM nếu chưa có định vị
  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : [10.762622, 106.660172];

  return (
    <div className="w-full h-full relative">
      {!userLocation && (
        <div className="absolute inset-0 bg-white/80 z-[1000] flex flex-col items-center justify-center p-4 text-center">
          <p className="mb-4 text-gray-700 font-medium">Bạn cần cấp quyền vị trí để sử dụng tính năng GPS âm thanh.</p>
          <button onClick={requestPermission} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow">
            Cấp quyền GPS
          </button>
        </div>
      )}

      <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%", zIndex: 0 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
            <Popup>Vị trí của bạn</Popup>
          </Marker>
        )}

        {/* Mapped POIs */}
        {nearbyPOIs.map((poi) => (
          <div key={poi.id}>
            <Marker position={[poi.lat, poi.lng]} icon={poiIcon} eventHandlers={{ click: () => setSelectedPoi(poi) }} />
            <Circle 
               center={[poi.lat, poi.lng] as [number, number]} 
               radius={(poi.range_m ?? 1) + 3} 
               pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.1, weight: 1, dashArray: "4" }} 
            />
          </div>
        ))}
      </MapContainer>

      {selectedPoi && <UserPoiModal poi={selectedPoi} onClose={() => setSelectedPoi(null)} />}
    </div>
  );
}
