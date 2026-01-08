"use client";

import { useState, useEffect } from "react";
import api from "@/axios/api";
import { useRouter } from "next/navigation";

export default function CreatePackagePage() {
  const router = useRouter();
  const [magazines, setMagazines] = useState([]);
  const [formData, setFormData] = useState({
    magazine_id: "",
    receiver_name: "",
    receiver_address: "",
    size: "M",
    weight: "",
  });

  useEffect(() => {
    api.get("api/business/magazines").then((res) => {
      setMagazines(res.data);
      if (res.data.length > 0) setFormData((prev) => ({ ...prev, magazine_id: res.data[0].id }));
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("api/business/packages", formData);
      router.push("/business/packages");
    } catch (err) {
      alert("Failed to create package");
    }
  };

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

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Name</label>
            <input type="text" required className="w-full p-3 border rounded-xl" value={formData.receiver_name} onChange={(e) => setFormData({ ...formData, receiver_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Receiver Address</label>
            <input type="text" required className="w-full p-3 border rounded-xl" value={formData.receiver_address} onChange={(e) => setFormData({ ...formData, receiver_address: e.target.value })} />
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

        <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition">
          Create Package
        </button>
      </form>
    </div>
  );
}
