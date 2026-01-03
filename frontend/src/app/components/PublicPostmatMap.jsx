"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import L from "leaflet";

// Fix Leaflet icons
const iconFix = () => {
    if (L.Icon.Default.prototype._getIconUrl) {
        delete L.Icon.Default.prototype._getIconUrl;
    }
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    });
};

function MapController({ selectedPoint }) {
    const map = useMap();
    useEffect(() => {
        if (selectedPoint) {
            map.flyTo([selectedPoint.latitude, selectedPoint.longitude], 15);
        }
    }, [selectedPoint, map]);
    return null;
}

export default function PublicPostmatMap({ points, selectedPoint }) {
    const [isMounted, setIsMounted] = useState(false);
    
    // Default Center (Poland)
    const [position, setPosition] = useState([52.0693, 19.4803]);
    const [zoom, setZoom] = useState(6);

    useEffect(() => {
        if (typeof window !== "undefined") {
            iconFix();
            setIsMounted(true);
            
            // Try to get user location for better UX
            if (navigator.geolocation && !selectedPoint) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    setPosition([pos.coords.latitude, pos.coords.longitude]);
                    setZoom(12);
                });
            }
        }
    }, [selectedPoint]);

    if (!isMounted) return <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500">Loading Map...</div>;

    const customIcon = L.divIcon({
        className: 'custom-icon',
        html: `<div style="background-color: #F59E0B; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-weight: bold; font-size: 16px;">P</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
    });

    return (
        <MapContainer center={position} zoom={zoom} style={{ height: "100%", width: "100%", zIndex: 0 }}>
            <MapController selectedPoint={selectedPoint} />
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {points.map(pm => (
                <Marker 
                    key={pm.id} 
                    position={[pm.latitude, pm.longitude]}
                    icon={customIcon}
                >
                    <Popup className="custom-popup">
                        <div className="w-64">
                            {pm.image && (
                                <div className="w-full h-32 mb-2 rounded-lg overflow-hidden bg-gray-100 relative">
                                    {/* Using standard img tag because next/image requires domain config */}
                                    <img 
                                        src={pm.image} 
                                        alt={pm.name} 
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="font-bold text-lg text-gray-900">{pm.name}</div>
                            <div className="text-sm text-gray-600 mb-2">{pm.address}</div>
                            <div className="flex gap-2">
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                                    24/7 Access
                                </span>
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-bold rounded">
                                    Available
                                </span>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}