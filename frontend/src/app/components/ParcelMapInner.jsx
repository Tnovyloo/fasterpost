"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default icon URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function ParcelMapInner({
  postmats,
  selectedOriginId,
  selectedDestinationId,
  onSelect,
}) {
  return (
    <MapContainer
      center={[52.2297, 21.0122]}
      zoom={13}
      style={{ height: "400px", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {postmats.map((pm) => {
        const isOrigin = pm.id === selectedOriginId;
        const isDest = pm.id === selectedDestinationId;

        return (
          <Marker key={pm.id} position={[pm.latitude, pm.longitude]}>
            <Popup>
              <div className="flex flex-col gap-2">
                <p className="font-bold">{pm.name}</p>
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-white ${
                    isOrigin ? "bg-blue-800" : "bg-blue-600"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({ name: pm.name ?? "" }, "origin")
                  }}
                >
                  Wybierz jako nadawczy
                </button>
                <button
                  type="button"
                  className={`px-2 py-1 rounded text-white ${
                    isDest ? "bg-green-800" : "bg-green-600"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({ name: pm.name ?? "" }, "destination")

                  }}
                >
                  Wybierz jako docelowy
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
