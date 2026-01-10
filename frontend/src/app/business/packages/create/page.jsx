"use client";

import { useState, useEffect } from "react";
import api from "@/axios/api";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const ParcelMapSendPackage = dynamic(
  () => import("@/app/components/ParcelMapSendPackage"),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 rounded-xl flex items-center justify-center">Loading Map...</div> }
);

export default function CreatePackagePage() {
  const router = useRouter();
  const [magazines, setMagazines] = useState([]);
  const [postmats, setPostmats] = useState([]);
  const [formData, setFormData] = useState({
    magazine_id: "",
    destination_postmat_id: "",
    receiver_name: "",
    receiver_phone: "",
    receiver_email: "",
    size: "M",
    weight: "",
  });
  const [estimatedPrice, setEstimatedPrice] = useState(null);

  useEffect(() => {
    api.get("api/business/magazines").then((res) => {
      setMagazines(res.data);
      if (res.data.length > 0) setFormData((prev) => ({ ...prev, magazine_id: res.data[0].id }));
    });

    api.get("api/postmats/public/points/").then((res) => {
      setPostmats(res.data);
      if (res.data.length > 0) setFormData((prev) => ({ ...prev, destination_postmat_id: res.data[0].id }));
    });
  }, []);

  useEffect(() => {
    if (formData.weight && formData.size) {
      const timer = setTimeout(() => {
        api.post("api/business/calculate-price", { size: formData.size, weight: formData.weight })
          .then(res => setEstimatedPrice(res.data.total))
          .catch(() => setEstimatedPrice(null));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.weight, formData.size]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("api/business/packages", formData);
      router.push("/business/packages");
    } catch (err) {
      alert("Failed to create package");
    }
  };

  const selectedDestination = postmats.find(p => p.id === formData.destination_postmat_id) || null;

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Package</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Source Magazine</label>
          <select className="w-full p-3 border rounded-xl bg-gray-50" value={formData.magazine_id} onChange={(e) => setFormData({ ...formData, magazine_id: e.target.value })}>
            {magazines.map((m) => (
              <option key={m.id} value={m.id}>{m.name} - {m.address}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Destination Postmat</label>
          <div className="mb-3 p-3 border rounded-xl bg-gray-50 text-sm text-gray-700">
            {selectedDestination ? `${selectedDestination.name} - ${selectedDestination.address}` : "Please select a destination on the map below"}
          </div>
          <div className="h-80 rounded-xl overflow-hidden border border-gray-200">
            <ParcelMapSendPackage 
              postmats={postmats}
              destination={selectedDestination}
              setDestination={(pm) => setFormData({ ...formData, destination_postmat_id: pm.id })}
              hideOriginSelect={true}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Name</label>
            <input type="text" required className="w-full p-3 border rounded-xl" value={formData.receiver_name} onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Phone</label>
            <input type="tel" required className="w-full p-3 border rounded-xl" value={formData.receiver_phone} onChange={(e) => setFormData({ ...formData, receiver_phone: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Email</label>
            <input type="email" required className="w-full p-3 border rounded-xl" value={formData.receiver_email} onChange={(e) => setFormData({ ...formData, receiver_email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
            <select className="w-full p-3 border rounded-xl" value={formData.size} onChange={(e) => setFormData({ ...formData, size: e.target.value })}>
              <option value="S">Small</option>
              <option value="M">Medium</option>
              <option value="L">Large</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
            <input type="number" required className="w-full p-3 border rounded-xl" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} />
          </div>
        </div>

        {estimatedPrice && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex justify-between items-center">
            <span className="text-green-800 font-medium">Estimated Cost:</span>
            <span className="text-2xl font-bold text-green-700">${parseFloat(estimatedPrice).toFixed(2)}</span>
          </div>
        )}

        <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
          Create Package
        </button>
      </form>
    </div>
  );
}
