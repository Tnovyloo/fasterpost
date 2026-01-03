"use client";

import { useState } from "react";
import Header from "@/app/components/Header";
import api from "@/axios/api";

export default function TrackPackagePage() {
  const [query, setQuery] = useState("");
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setPackageData(null);

    try {
      // Note: Endpoint moved to packages app as requested
      const res = await api.get(`/api/packages/public/track/${query}/`);
      setPackageData(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Package not found. Please check your tracking ID.");
      } else {
        setError("System error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString('pl-PL', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  // Status mapping for visuals
  const getStatusInfo = (status) => {
    const map = {
      'created': { label: 'Registered', color: 'bg-gray-100 text-gray-600', border: 'border-gray-300', icon: '📝' },
      'in_warehouse': { label: 'In Warehouse', color: 'bg-indigo-50 text-indigo-700', border: 'border-indigo-200', icon: '🏭' },
      'in_transit': { label: 'In Transit', color: 'bg-blue-50 text-blue-700', border: 'border-blue-200', icon: '🚚' },
      'placed_in_stash': { label: 'Ready for Pickup', color: 'bg-yellow-50 text-yellow-700', border: 'border-yellow-200', icon: '📦' },
      'delivered': { label: 'Delivered', color: 'bg-green-50 text-green-700', border: 'border-green-200', icon: '✅' },
      'picked_up': { label: 'Picked Up', color: 'bg-green-50 text-green-700', border: 'border-green-200', icon: '✅' },
    };
    return map[status] || { label: status, color: 'bg-gray-50', border: 'border-gray-200', icon: '❓' };
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans">
      <Header />

      <main className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Track Your Shipment</h1>
          <p className="text-gray-500 text-lg">Enter your tracking UUID to see current status</p>
        </div>

        {/* Search Input */}
        <div className="bg-white p-2 rounded-2xl shadow-xl border border-gray-100 max-w-2xl mx-auto mb-12 transform transition-all hover:scale-[1.01]">
          <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
              className="flex-1 px-6 py-4 rounded-xl text-lg outline-none text-gray-800 placeholder-gray-400 bg-transparent"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md text-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Tracking...
                </span>
              ) : "Track"}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center max-w-2xl mx-auto mb-8 animate-fade-in shadow-sm">
            <span className="font-bold mr-2">Error:</span> {error}
          </div>
        )}

        {/* Tracking Results */}
        {packageData && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up">
            
            {/* Package Summary Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-white">
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">Tracking Number</p>
                  <p className="font-mono text-xl sm:text-2xl break-all">{packageData.id}</p>
                </div>
                <div className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">Route</span>
                    <span className="font-medium text-lg">
                      {packageData.origin_city} <span className="text-gray-500 mx-1">→</span> {packageData.destination_city}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-b border-gray-200">
                <div className="p-6 text-center">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Package Size</p>
                    <p className="text-xl font-bold text-gray-900 capitalize">{packageData.size}</p>
                </div>
                <div className="p-6 text-center">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Latest Update</p>
                    <p className="text-lg font-medium text-gray-900">
                        {packageData.history?.[0] ? formatDate(packageData.history[0].created_at) : "N/A"}
                    </p>
                </div>
                 <div className="p-6 text-center">
                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Current Status</p>
                    <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-bold mt-1">
                        {packageData.history?.[0]?.status_display || "Unknown"}
                    </span>
                </div>
            </div>

            {/* Timeline Section */}
            <div className="p-8 bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                History
              </h3>
              
              <div className="space-y-0 relative pl-4 sm:pl-8 border-l-2 border-gray-200 ml-4 sm:ml-6 pb-2">
                {packageData.history?.map((event, idx) => {
                  const info = getStatusInfo(event.status);
                  const isLatest = idx === 0;

                  return (
                    <div key={idx} className="relative pl-8 pb-10 last:pb-0 group">
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 
                        ${isLatest ? 'bg-blue-600 border-blue-100 shadow-[0_0_0_4px_rgba(59,130,246,0.2)]' : 'bg-gray-300 border-white'}
                        transition-all group-hover:scale-110
                      `}></div>

                      {/* Content Card */}
                      <div className={`flex flex-col sm:flex-row gap-4 p-4 rounded-xl border transition-all
                        ${isLatest ? 'bg-white border-blue-200 shadow-md' : 'bg-transparent border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm'}
                      `}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 ${info.color}`}>
                           {info.icon}
                        </div>
                        
                        <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                                <div>
                                    <h4 className={`font-bold text-lg ${isLatest ? 'text-gray-900' : 'text-gray-700'}`}>
                                        {info.label}
                                    </h4>
                                    <p className="text-gray-500 mt-1">
                                        {event.location || "Logistics Network"}
                                    </p>
                                </div>
                                <span className="text-sm font-mono text-gray-400 mt-2 sm:mt-0 bg-gray-100 px-2 py-1 rounded self-start">
                                    {formatDate(event.created_at)}
                                </span>
                            </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}