"use client";

import { useState } from "react";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import api from "@/axios/api";
import { PackageOpen, Lock, User, CheckCircle } from "lucide-react";

export default function PickupPage() {
  const [contact, setContact] = useState("");
  const [unlockCode, setUnlockCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handlePickup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await api.post("/api/packages/public/pickup/", {
        contact,
        unlock_code: unlockCode
      });
      setMessage({ type: "success", text: res.data.message });
      setContact("");
      setUnlockCode("");
    } catch (err) {
      setMessage({ 
        type: "error", 
        text: err.response?.data?.error || "Failed to pickup package." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-20 pt-32">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-blue-600 p-8 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                <PackageOpen className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Pickup Package</h1>
            <p className="text-blue-100 mt-2 text-sm">Enter your details to open the locker</p>
          </div>

          <div className="p-8">
            {message && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
                <p className="font-medium text-sm">{message.text}</p>
              </div>
            )}

            <form onSubmit={handlePickup} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Contact Info</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Email or Phone Number"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
                        required
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Unlock Code</label>
                <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="e.g. 1234"
                        value={unlockCode}
                        onChange={(e) => setUnlockCode(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition font-mono tracking-widest"
                        required
                    />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                {loading ? "Verifying..." : "Open Locker"}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}