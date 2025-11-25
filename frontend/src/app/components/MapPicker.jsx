"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapEvents({ setPosition, readonly }) {
  useMapEvents({
    click(e) {
      if (!readonly) {
        setPosition([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

export default function MapPicker({ position, setPosition, readonly = false }) {
  return (
    <div className="h-96 rounded-lg overflow-hidden border shadow-md relative">
      <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
        />
        <MapEvents setPosition={setPosition} readonly={readonly} />

        {position && (
          <Marker position={position}>
            <Popup>
              Selected Location
              <br />
              Lat: {position[0].toFixed(6)}
              <br />
              Lng: {position[1].toFixed(6)}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {!readonly && (
        <div className="absolute bottom-0 left-0 right-0 bg-blue-600 text-white text-center py-2 text-sm font-medium z-10">
          Click on the map to set Postmat location
        </div>
      )}
    </div>
  );
}