"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const iconBlue = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
    iconSize: [32, 32],
  });
  
const iconOrigin = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
    iconSize: [36, 36],
});
  
const iconDestination = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/1828/1828665.png",
    iconSize: [36, 36],
});
  

export default function ParcelMapSendPackage({
    postmats,
    origin,
    destination,
    setOrigin,
    setDestination,
}) {
    // Your API fields are explicitly: latitude, longitude
    const getLat = (pm) => pm.latitude;
    const getLng = (pm) => pm.longitude;

    // Map center: use first postmat
    const mapCenter =
        postmats.length > 0
            ? [postmats[0].latitude, postmats[0].longitude]
            : [50.0, 20.0];

    return (
        <MapContainer
            center={mapCenter}
            zoom={12}
            className="h-full w-full rounded-xl overflow-hidden"
        >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
            />

            {postmats.map((pm, index) => {
                const lat = pm.latitude;
                const lng = pm.longitude;

                if (!lat || !lng) return null;

                // Markers need a unique key
                const key = `${pm.name}-${index}`;

                // Choose icon
                let icon = iconBlue;

                if (origin?.name === pm.name) icon = iconOrigin;
                if (destination?.name === pm.name) icon = iconDestination;

                return (
                    <Marker key={key} position={[lat, lng]} icon={icon}>
                        <Popup>
                            <div className="space-y-2">
                                <p className="font-semibold">{pm.name}</p>

                                <button
                                    className="bg-green-600 text-white px-3 py-1 rounded-lg w-full"
                                    onClick={() => setOrigin(pm)}
                                >
                                    Set as Origin
                                </button>

                                <button
                                    className="bg-red-600 text-white px-3 py-1 rounded-lg w-full"
                                    onClick={() => setDestination(pm)}
                                >
                                    Set as Destination
                                </button>
                            </div>
                        </Popup>
                    </Marker>
                );
            })}
        </MapContainer>
    );
}
