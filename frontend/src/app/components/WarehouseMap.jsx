"use client"

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";

export default function WarehouseMap({ warehouses }) {
  const [Leaflet, setLeaflet] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((mod) => {
        const L = mod.default;
        setLeaflet(L);
        
        // Fix for default markers
        if (L.Icon.Default.prototype._getIconUrl) {
            delete L.Icon.Default.prototype._getIconUrl;
        }
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });
      });
    }
  }, []);

  if (!Leaflet || warehouses.length === 0) {
    return (
      <div className="h-96 rounded-lg border bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">
          {!Leaflet ? "Loading map..." : "No warehouses to display"}
        </p>
      </div>
    );
  }

  // Calculate center of all warehouses
  const center = warehouses.length > 0
    ? [
        warehouses.reduce((sum, w) => sum + w.latitude, 0) / warehouses.length,
        warehouses.reduce((sum, w) => sum + w.longitude, 0) / warehouses.length
      ]
    : [52.2297, 21.0122];

  // Create connection lines
  const connections = [];
  const processed = new Set();

  warehouses.forEach(warehouse => {
    if (warehouse.connections && Array.isArray(warehouse.connections)) {
      warehouse.connections.forEach(conn => {
        const connKey = [warehouse.id, conn.id].sort().join("-");
        if (!processed.has(connKey)) {
          const targetWarehouse = warehouses.find(w => w.id === conn.id);
          if (targetWarehouse) {
            connections.push({
              positions: [
                [warehouse.latitude, warehouse.longitude],
                [targetWarehouse.latitude, targetWarehouse.longitude]
              ],
              distance: conn.distance,
              from: warehouse.city,
              to: targetWarehouse.city
            });
            processed.add(connKey);
          }
        }
      });
    }
  });

  // Color coding for warehouse status
  const getMarkerColor = (status) => {
    switch (status) {
      case "active": return "green";
      case "inactive": return "red";
      case "under_maintenance": return "orange";
      default: return "blue";
    }
  };

  const createColoredIcon = (color) => {
    return Leaflet.divIcon({
      className: "custom-icon",
      html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 12],
    });
  };

  return (
    <MapContainer
      center={center}
      zoom={6}

      style={{ height: "600px", width: "100%", borderRadius: "0.75rem", zIndex: 0 }}
      className="shadow-lg relative"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      
      {/* Draw connection lines */}
      {connections.map((conn, idx) => (
        <Polyline
          key={idx}
          positions={conn.positions}
          color="#3B82F6"
          weight={2}
          opacity={0.6}
          dashArray="5, 10"
        >
          <Popup>
            <strong>{conn.from} ↔ {conn.to}</strong><br />
            Distance: {conn.distance} km
          </Popup>
        </Polyline>
      ))}

      {/* Draw warehouse markers */}
      {warehouses.map(warehouse => (
        <Marker
          key={warehouse.id}
          position={[warehouse.latitude, warehouse.longitude]}
          icon={createColoredIcon(getMarkerColor(warehouse.status))}
        >
          <Popup>
            <div className="font-semibold text-lg">{warehouse.city}</div>
            <div className="text-sm mt-1">
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                warehouse.status === 'active' ? 'bg-green-100 text-green-800' :
                warehouse.status === 'inactive' ? 'bg-red-100 text-red-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {warehouse.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-xs text-gray-600 mt-2">
              Connections: {warehouse.connections?.length || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {warehouse.latitude.toFixed(4)}, {warehouse.longitude.toFixed(4)}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}