import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { LocateFixed } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { POIWithDistance } from "../hooks/useUserGPS";
import { UserPoiModal } from "../components/UserPoiModal";
import { Tour, POI } from "../../../types";

// Standard Leaflet Icon handling - Fix missing marker images
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
});

const poiIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const userIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Helper component: FitBoundsToTour (Handles panning/zooming to see all points in a tour)
function FitBoundsToTour({ highlightedTour, focusPoi }: { highlightedTour: Tour | null, focusPoi: POI | null }) {
  const map = useMap();

  // 1. Focus on a specific POI (e.g., from the info tab)
  useEffect(() => {
    const lat = Number(focusPoi?.lat);
    const lng = Number(focusPoi?.lng);
    if (focusPoi && !isNaN(lat) && !isNaN(lng)) {
      map.setView([lat, lng], 16, { animate: true });
    }
  }, [focusPoi, map]);

  // 2. Fit bounds to see all points in a tour
  useEffect(() => {
    if (!highlightedTour || !highlightedTour.pois || highlightedTour.pois.length === 0) return;

    // Filter valid coordinates and explicitly cast to Number to prevent 
    // Leaflet crashes from string types from SQLite/API.
    const validPoints = highlightedTour.pois
      .filter(p => !isNaN(Number(p.lat)) && !isNaN(Number(p.lng)))
      .map(p => L.latLng(Number(p.lat), Number(p.lng)));

    if (validPoints.length === 0) return;

    if (validPoints.length === 1) {
      // Specialized handling for single-point tours to avoid zoom errors
      map.setView(validPoints[0], 16, { animate: true });
    } else {
      const bounds = L.latLngBounds(validPoints);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [highlightedTour, map]);

  return null;
}

// Locate Me button component
function LocateControl({ userLocation }: { userLocation: { lat: number; lng: number } | null }) {
  const map = useMap();

  const handleLocate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userLocation) {
      alert("Vui lòng bật GPS để xác định vị trí của bạn");
      return;
    }

    map.flyTo([Number(userLocation.lat), Number(userLocation.lng)], 16, {
      animate: true,
      duration: 1.5
    });
  };

  return (
    <div className="leaflet-bottom leaflet-right mb-20 mr-4 pointer-events-auto" style={{ zIndex: 1000 }}>
       <button 
         onClick={handleLocate}
         className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-600 hover:bg-gray-50 active:scale-90 transition-all border border-gray-100"
         title="Vị trí của tôi"
       >
         <LocateFixed size={24} />
       </button>
    </div>
  );
}

interface GlobalContext {
  userLocation: { lat: number; lng: number } | null;
  nearbyPOIs: POIWithDistance[];
  currentAudioPoi: POIWithDistance | null;
  isPlaying: boolean;
  requestPermission: () => void;
  highlightedTour: Tour | null;
  setHighlightedTour: (tour: Tour | null) => void;
  mapFocusPoi: POI | null;
  setMapFocusPoi: (poi: POI | null) => void;
}

export function MapTab() {
  const { userLocation, nearbyPOIs, requestPermission, highlightedTour, mapFocusPoi } = useOutletContext<GlobalContext>();
  console.log("MapTab nhận được Tour:", highlightedTour);

  const [selectedPoi, setSelectedPoi] = useState<POIWithDistance | null>(null);

  const center: [number, number] = userLocation 
    ? [Number(userLocation.lat), Number(userLocation.lng)] 
    : [10.762622, 106.660172];

  // Detect and open POI modal if deep-linked via mapFocusPoi
  useEffect(() => {
    if (mapFocusPoi) {
      setSelectedPoi(mapFocusPoi as POIWithDistance);
    }
  }, [mapFocusPoi]);

  const createNumberedIcon = (number: number) => {
    return L.divIcon({
      html: `
        <div class="relative flex items-center justify-center transform hover:scale-110 transition-transform">
           <div class="bg-orange-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-[0_4px_10px_rgba(234,88,12,0.5)] border-2 border-white ring-1 ring-orange-200">
             ${number}
           </div>
           <div class="absolute -bottom-1 w-2 h-2 bg-orange-600 rotate-45 transform"></div>
        </div>
      `,
      className: "custom-tour-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
  };

  return (
    <div className="w-full h-full relative">
      {!userLocation && (
        <div className="absolute inset-0 bg-white/80 z-[1000] flex flex-col items-center justify-center p-4 text-center">
          <p className="mb-4 text-gray-700 font-medium font-bold">Bạn cần cấp quyền vị trí để sử dụng tính năng GPS âm thanh.</p>
          <button onClick={requestPermission} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow font-bold active:scale-95 transition-transform">
            Cấp quyền GPS
          </button>
        </div>
      )}

      <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%", zIndex: 0 }} scrollWheelZoom={true}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBoundsToTour highlightedTour={highlightedTour} focusPoi={mapFocusPoi} />
        <LocateControl userLocation={userLocation} />

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={[Number(userLocation.lat), Number(userLocation.lng)]} icon={userIcon}>
            <Popup>Vị trí của bạn</Popup>
          </Marker>
        )}

        {/* LOOP 1: Render All POIs from Highlighted Tour (Always visible, explicit sequence) */}
        {highlightedTour?.pois?.map((p) => (
           <React.Fragment key={`tour-poi-${p.poi_id}`}>
              <Marker 
                position={[Number(p.lat), Number(p.lng)]} 
                icon={createNumberedIcon(p.position)}
                // Deep link POI details even if not in "nearby" dataset
                eventHandlers={{ click: () => setSelectedPoi(nearbyPOIs.find(n => n.id === p.poi_id) || (p as any)) }}
              />
              <Circle 
                 center={[Number(p.lat), Number(p.lng)] as [number, number]} 
                 radius={Number((p as any).range_m || 20) + 3} 
                 pathOptions={{ color: "#ea580c", fillColor: "#ea580c", fillOpacity: 0.1, weight: 1, dashArray: "4" }} 
              />
           </React.Fragment>
        ))}

        {/* LOOP 2: Render Standard Nearby POIs (Only if NOT in a highlighted tour to avoid double rendering) */}
        {nearbyPOIs
          .filter(p => !highlightedTour?.pois?.some(tp => tp.poi_id === p.id))
          .map((poi) => (
            <React.Fragment key={`nearby-poi-${poi.id}`}>
              <Marker 
                position={[Number(poi.lat), Number(poi.lng)]} 
                icon={poiIcon}
                eventHandlers={{ click: () => setSelectedPoi(poi) }}
              />
              <Circle 
                 center={[Number(poi.lat), Number(poi.lng)] as [number, number]} 
                 radius={Number(poi.range_m ?? 20) + 3} 
                 pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.1, weight: 1, dashArray: "4" }} 
              />
            </React.Fragment>
          ))
        }
      </MapContainer>

      {selectedPoi && <UserPoiModal poi={selectedPoi} onClose={() => setSelectedPoi(null)} />}
    </div>
  );
}

