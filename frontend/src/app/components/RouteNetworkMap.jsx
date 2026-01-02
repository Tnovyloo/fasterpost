"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
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

function MapUpdater({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || map.getZoom());
        }
    }, [center, zoom, map]);
    return null;
}

export default function RouteNetworkMap({ routes, warehouses, onGenerateLocal, onClearHub, onSelectHub, selectedHubId }) {
    const [isMounted, setIsMounted] = useState(false);
    const [generatingId, setGeneratingId] = useState(null);
    const [clearingId, setClearingId] = useState(null);
    const [mapView, setMapView] = useState({ center: [52.0693, 19.4803], zoom: 6 });

    useEffect(() => {
        if (typeof window !== "undefined") {
            iconFix();
            setIsMounted(true);
        }
    }, []);

    useEffect(() => {
        if (selectedHubId) {
            const hub = warehouses.find(w => w.id === selectedHubId);
            if (hub) {
                setMapView({ center: [hub.latitude, hub.longitude], zoom: 12 });
            }
        }
    }, [selectedHubId, warehouses]);

    if (!isMounted) return <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500">Loading Map...</div>;

    const getRouteColor = (route) => {
        if (route.route_type === 'last_mile') {
            let hash = 0;
            for (let i = 0; i < route.id.length; i++) {
                hash = route.id.charCodeAt(i) + ((hash << 5) - hash);
            }
            const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
            return '#' + "00000".substring(0, 6 - c.length) + c;
        }
        
        switch(route.status) {
            case 'in_progress': return '#3B82F6';
            case 'completed': return '#10B981';
            case 'cancelled': return '#EF4444';
            default: return '#6366F1';
        }
    };

    const handleLocalGen = async (e, whId) => {
        e.stopPropagation();
        setGeneratingId(whId);
        await onGenerateLocal(whId);
        setGeneratingId(null);
    };

    const handleClearLocal = async (e, whId) => {
        e.stopPropagation();
        setClearingId(whId);
        await onClearHub(whId);
        setClearingId(null);
    };

    return (
        <MapContainer center={mapView.center} zoom={mapView.zoom} style={{ height: "100%", width: "100%", zIndex: 0 }}>
            <MapUpdater center={mapView.center} zoom={mapView.zoom} />
            
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {/* Hub Markers */}
            {warehouses.map(wh => (
                <Marker 
                    key={wh.id} 
                    position={[wh.latitude, wh.longitude]}
                    opacity={selectedHubId && selectedHubId !== wh.id ? 0.5 : 1}
                >
                    <Popup>
                        <div className="min-w-[200px]">
                            <div className="font-bold text-lg mb-1">{wh.city} Hub</div>
                            <div className="text-xs text-gray-500 mb-3">{wh.address}</div>
                            
                            <div className="flex flex-col gap-2 border-t pt-2">
                                <button 
                                    onClick={() => onSelectHub(wh.id)}
                                    className="w-full py-1.5 px-3 rounded text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition"
                                >
                                    🔍 Focus & Filter Routes
                                </button>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <button 
                                        onClick={(e) => handleLocalGen(e, wh.id)}
                                        disabled={generatingId === wh.id || clearingId === wh.id}
                                        className={`py-1.5 px-3 rounded text-xs font-bold text-white transition
                                            ${generatingId === wh.id ? 'bg-gray-400 cursor-wait' : 'bg-gray-800 hover:bg-black shadow-sm'}
                                        `}
                                    >
                                        {generatingId === wh.id ? "..." : "Route"}
                                    </button>
                                    <button 
                                        onClick={(e) => handleClearLocal(e, wh.id)}
                                        disabled={clearingId === wh.id}
                                        className={`py-1.5 px-3 rounded text-xs font-bold border transition
                                            ${clearingId === wh.id ? 'bg-gray-100 text-gray-400 border-gray-200' : 'text-red-600 border-red-200 hover:bg-red-50'}
                                        `}
                                    >
                                        {clearingId === wh.id ? "..." : "Clear"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* Routes */}
            {routes.map(route => {
                const stops = route.stops || [];
                const isLocal = route.route_type === 'last_mile';
                const color = getRouteColor(route);

                const positions = stops.map(s => {
                    if (s.warehouse) return [s.warehouse.latitude, s.warehouse.longitude];
                    if (s.postmat) return [s.postmat.latitude, s.postmat.longitude];
                    return null; 
                }).filter(pos => pos !== null);

                if (positions.length < 2) return null;

                return (
                    <div key={route.id}>
                        <Polyline 
                            positions={positions}
                            pathOptions={{ 
                                color: color, 
                                weight: isLocal ? 2 : 4, 
                                opacity: isLocal ? 0.8 : 0.6,
                                dashArray: route.status === 'planned' ? '5, 5' : null
                            }}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <div className="font-bold border-b pb-1 mb-1">
                                        {isLocal ? "📦 Last Mile" : "🚛 Line Haul"}
                                    </div>
                                    <div className="space-y-0.5">
                                        <div>Status: <strong>{route.status}</strong></div>
                                        <div>Driver: {route.courier_name}</div>
                                        <div>Dist: {route.total_distance} km</div>
                                        <div>Stops: {stops.length}</div>
                                    </div>
                                </div>
                            </Popup>
                        </Polyline>
                        
                        {isLocal && stops.map((stop, idx) => {
                            if (!stop.postmat) return null;
                            return (
                                <CircleMarker 
                                    key={stop.id}
                                    center={[stop.postmat.latitude, stop.postmat.longitude]}
                                    pathOptions={{ color: color, fillColor: 'white', fillOpacity: 1, weight: 2 }}
                                    radius={4}
                                >
                                    <Popup>
                                        <div className="text-xs font-bold">{stop.postmat.name}</div>
                                        <div className="text-[10px] text-gray-500">Stop #{stop.order}</div>
                                    </Popup>
                                </CircleMarker>
                            )
                        })}
                    </div>
                );
            })}
        </MapContainer>
    );
}