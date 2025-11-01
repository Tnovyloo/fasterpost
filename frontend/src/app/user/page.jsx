"use client";

import { useEffect, useState } from "react";

import axiosClient from "@/axios/api";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function UserPanel() {
  const [user, setUser] = useState(null);
  const [parcels, setParcels] = useState([]);

  useEffect(() => {
    axiosClient.get("/accounts/user/info/").then(res => setUser(res.data));
    axiosClient.get("/api/packages/user/").then(res => setParcels(res.data));
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <Header />
      <main className="flex-1 px-6 py-10">
        <div className="max-w-4xl mx-auto bg-white/80 rounded-2xl shadow p-6">
          <h1 className="text-2xl font-bold text-blue-800 mb-4">
            Witaj, {user?.username || "Użytkowniku"} 👋
          </h1>

          <h2 className="text-lg font-semibold mb-2 text-gray-700">Twoje przesyłki:</h2>
          <div className="grid gap-4">
            {parcels.map((p) => (
              <div key={p.id} className="p-4 border rounded-xl bg-white/90 shadow-sm">
                <p className="font-medium text-blue-700">📦 {p.trackingNumber}</p>
                <p className="text-sm text-gray-600">Status: {p.status}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
