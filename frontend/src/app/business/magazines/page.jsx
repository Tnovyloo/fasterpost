"use client";

import { useState, useEffect } from "react";
import api from "@/axios/api";
import { MapPin, Plus } from "lucide-react";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/app/components/MapPicker"), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center">Loading Map...</div>,
});

export default function MagazinesPage() {
  const [magazines, setMagazines] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", address: "", lat: 52.2297, lng: 21.0122 });

  useEffect(() => {
    fetchMagazines();
  }, []);

  const fetchMagazines = () => {
    api.get("api/business/magazines").then((res) => setMagazines(res.data));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("api/business/magazines", formData);
      setShowForm(false);
      fetchMagazines();
    } catch (err) {
      alert("Failed to add magazine");
    }
  };

  return (
    <div className="space-y-6 text-black">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">My Magazines</h1>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition">
          <Plus className="w-4 h-4" /> Add Magazine
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          <h2 className="text-lg font-bold mb-4">Add New Magazine</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Magazine Name</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1 w-full p-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input type="text" required value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="mt-1 w-full p-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500">Lat</label>
                  <input type="number" step="any" value={formData.lat} readOnly className="w-full p-2 bg-gray-50 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500">Lng</label>
                  <input type="number" step="any" value={formData.lng} readOnly className="w-full p-2 bg-gray-50 rounded-lg" />
                </div>
              </div>
              <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg">Save Magazine</button>
            </form>

            {/* Real Map */}
            <div className="h-64 rounded-xl border-2 border-gray-200 overflow-hidden relative z-0">
              <MapPicker
                lat={formData.lat}
                lng={formData.lng}
                onLocationSelect={(latlng) => setFormData({ ...formData, lat: latlng.lat, lng: latlng.lng })}
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {magazines.map((mag) => (
          <div key={mag.id} className="bg-white p-5 rounded-xl border shadow-sm">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-gray-800">{mag.name}</h3>
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">{mag.address}</p>
            <p className="text-xs text-gray-400 mt-2 font-mono">{mag.lat.toFixed(4)}, {mag.lng.toFixed(4)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
