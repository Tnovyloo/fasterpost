"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";

// Fix Leaflet icons
const iconFix = () => {
    // Check if prototype exists to avoid errors in some environments
    if (L.Icon.Default.prototype._getIconUrl) {
        delete L.Icon.Default.prototype._getIconUrl;
    }
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
};

export default function RouteNetworkMap({ routes, warehouses }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            iconFix();
            setIsMounted(true);
        }
    }, []);

    if (!isMounted) return <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500">Loading Map...</div>;

    // Center on Poland
    const center = [52.0693, 19.4803]; 
    const zoom = 6;

    // Helper: Get color based on status
    const getRouteColor = (status) => {
        switch(status) {
            case 'in_progress': return '#3B82F6'; // Blue
            case 'completed': return '#10B981'; // Green
            case 'cancelled': return '#EF4444'; // Red
            default: return '#6366F1'; // Indigo (Planned)
        }
    };

    return (
        <MapContainer center={center} zoom={zoom} style={{ height: "100%", width: "100%", zIndex: 0 }}>
            {/* Darker/Cleaner Map Style for "Control Room" feel */}
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {/* Layer 1: Warehouses (Hubs) */}
            {warehouses.map(wh => (
                <Marker key={wh.id} position={[wh.latitude, wh.longitude]}>
                    <Popup>
                        <div className="font-bold text-base">{wh.city} Hub</div>
                        <div className="text-xs text-gray-500">{wh.address}</div>
                    </Popup>
                </Marker>
            ))}

            {/* Layer 2: Routes */}
            {routes.map(route => {
                // FIX: Safety check for stops being undefined
                const stops = route.stops || [];

                // Extract coordinates from stops
                const positions = stops
                    .filter(s => (s.warehouse || s.postmat))
                    .map(s => {
                        if (s.warehouse) return [s.warehouse.latitude, s.warehouse.longitude];
                        if (s.postmat) return [s.postmat.latitude, s.postmat.longitude];
                        return null;
                    })
                    .filter(pos => pos !== null); // Remove nulls

                if (positions.length < 2) return null;

                const isLineHaul = route.route_type !== 'last_mile';

                return (
                    <Polyline 
                        key={route.id} 
                        positions={positions}
                        pathOptions={{ 
                            color: getRouteColor(route.status), 
                            weight: isLineHaul ? 4 : 2, 
                            opacity: isLineHaul ? 0.8 : 0.5,
                            dashArray: route.status === 'planned' ? '5, 10' : null
                        }}
                    >
                        <Popup>
                            <div className="text-sm p-1">
                                <div className="font-bold mb-1 border-b pb-1 text-gray-800">
                                    {isLineHaul ? "🚛 Line Haul" : "📦 Last Mile"}
                                </div>
                                <div className="space-y-1 mt-2">
                                    <div><span className="text-gray-500">Status:</span> <span className="font-mono font-bold text-gray-700">{route.status.toUpperCase()}</span></div>
                                    <div><span className="text-gray-500">Driver:</span> <span className="text-gray-900 font-medium">{route.courier_name || 'Unassigned'}</span></div>
                                    <div><span className="text-gray-500">Distance:</span> {route.total_distance} km</div>
                                    <div><span className="text-gray-500">Stops:</span> {stops.length}</div>
                                </div>
                            </div>
                        </Popup>
                    </Polyline>
                );
            })}

        </MapContainer>
    );
}