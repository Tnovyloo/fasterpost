"use client"

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const defaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

export default function ParcelMap({ location }) {
    if (!location) return null;

    return (
        <MapContainer center={[location.lat, location.lng]} 
                      zoom={16} 
                      scrollWheelZoom={false}
                      className="w-full h-full rounded-xl">
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"/>

            <Marker position={[location.lat, location.lng]}>
                <Popup>
                    Parcel Destination Postmat Location
                </Popup>
            </Marker>
        </MapContainer>
    );
}