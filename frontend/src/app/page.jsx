"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import api from "@/axios/api";

export default function Page() {
  const [query, setQuery] = useState("");
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Check for token to determine login state, matching api.js logic
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    setIsLoggedIn(!!token);
  }, []);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setPackageData(null);

    try {
      // api instance automatically handles baseURL and credentials
      const res = await api.get(`/api/packages/public/track/${query}/`);
      setPackageData(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError("Package not found. Please check your tracking number.");
      } else {
        setError("System error. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleString('en-US', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusInfo = (status) => {
    const map = {
      'created': { label: 'Registered', color: 'bg-gray-100 text-gray-600', icon: '📝' },
      'in_warehouse': { label: 'In Warehouse', color: 'bg-indigo-50 text-indigo-700', icon: '🏭' },
      'in_transit': { label: 'In Transit', color: 'bg-blue-50 text-blue-700', icon: '🚚' },
      'placed_in_stash': { label: 'Ready for Pickup', color: 'bg-yellow-50 text-yellow-700', icon: '📦' },
      'delivered': { label: 'Delivered', color: 'bg-green-50 text-green-700', icon: '✅' },
      'picked_up': { label: 'Picked Up', color: 'bg-green-50 text-green-700', icon: '✅' },
    };
    return map[status] || { label: status, color: 'bg-gray-50', icon: '❓' };
  };
  
  const currentStatusLabel = packageData?.history?.[0] 
    ? getStatusInfo(packageData.history[0].status).label 
    : "Unknown";

  // Render nothing until mounted to prevent hydration errors
  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <Header />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24">
        <div className="max-w-3xl w-full text-center animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full" />
              <img
                src="/file.svg"
                alt="FasterPost Logo"
                className="w-28 h-28 relative z-10 drop-shadow-md"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4 leading-tight">
            FasterPost — Faster. Easier. Safer.
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Track your packages in real-time or send a parcel in seconds.
          </p>

          {/* TRACKING SECTION */}
          <div className="bg-white p-2 rounded-2xl shadow-xl border border-blue-100 max-w-xl mx-auto mb-8 transform transition-all hover:scale-[1.01]">
            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tracking Number (e.g. TRK-123...)"
                className="flex-1 px-6 py-4 rounded-xl text-lg outline-none text-gray-800 placeholder-gray-400 bg-transparent"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-8 py-4 rounded-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md text-lg"
              >
                {loading ? "Searching..." : "Track"}
              </button>
            </form>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl text-center max-w-xl mx-auto mb-8 animate-fade-in">
              {error}
            </div>
          )}

          {/* TRACKING RESULTS CARD */}
          {packageData && (
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden text-left max-w-2xl mx-auto mb-10 animate-slide-up relative">
              {/* Header */}
              <div className="bg-gray-900 p-6 text-white flex justify-between items-start sm:items-center">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-widest font-bold mb-1">Tracking ID</p>
                  <p className="font-mono text-lg break-all pr-4">{packageData.id}</p>
                </div>
                
                <div className="text-right flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-white/20 text-white">
                        {currentStatusLabel}
                    </span>
                    <button 
                      onClick={() => setPackageData(null)}
                      className="text-gray-400 hover:text-white transition p-1 hover:bg-white/10 rounded-lg"
                      title="Close"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
              </div>

              {/* Route Info */}
              <div className="flex border-b border-gray-200 bg-gray-50">
                  <div className="flex-1 p-4 text-center border-r border-gray-200">
                      <p className="text-xs text-gray-500 uppercase font-bold">Origin</p>
                      <p className="font-semibold text-gray-900">{packageData.origin_city}</p>
                  </div>
                  <div className="flex-1 p-4 text-center">
                      <p className="text-xs text-gray-500 uppercase font-bold">Destination</p>
                      <p className="font-semibold text-gray-900">{packageData.destination_city}</p>
                  </div>
              </div>

              {/* Timeline */}
              <div className="p-6 max-h-96 overflow-y-auto">
                <div className="space-y-0 relative pl-4 border-l-2 border-gray-200 ml-2">
                  {packageData.history?.map((event, idx) => {
                    const info = getStatusInfo(event.status);
                    const isLatest = idx === 0;

                    return (
                      <div key={idx} className="relative pl-6 pb-8 last:pb-0">
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 
                          ${isLatest ? 'bg-blue-600 border-blue-100 shadow-[0_0_0_4px_rgba(59,130,246,0.2)]' : 'bg-gray-300 border-white'}
                        `}></div>

                        <div className={`p-3 rounded-xl border ${isLatest ? 'bg-blue-50/30 border-blue-100' : 'bg-white border-transparent'}`}>
                           <div className="flex justify-between items-start mb-1">
                               <h4 className={`font-bold ${isLatest ? 'text-gray-900' : 'text-gray-600'}`}>
                                   {info.label}
                               </h4>
                               <span className="text-xs font-mono text-gray-400">
                                   {formatDate(event.created_at)}
                               </span>
                           </div>
                           <p className="text-sm text-gray-500">
                               {event.location || "Logistics Center"}
                           </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Auth Buttons - Conditional Rendering */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-4">
            {!isLoggedIn ? (
              <>
                <Link
                  href="/login"
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-lg"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-8 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-semibold hover:bg-gray-50 transition shadow-md hover:shadow-lg"
                >
                  Register
                </Link>
              </>
            ) : (
              <Link
                href="/login" // Redirects to appropriate dashboard via Login page logic
                className="px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition shadow-md hover:shadow-lg flex items-center gap-2"
              >
                Go to Dashboard
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
            )}
          </div>
        </div>
      </main>

      {/* Info Section */}
      <section className="bg-white/70 backdrop-blur-xl border-t border-blue-100 py-12 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          <Feature
            title="⏱️ Express Delivery"
            description="Send packages in just a few clicks — skip the queues and paperwork."
          />
          <Feature
            title="📦 Full Control"
            description="Track shipments in real-time, from drop-off to final delivery."
          />
          <Feature
            title="🔒 Secure Transactions"
            description="Your data and parcels are protected by the latest security standards."
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Feature({ title, description }) {
  return (
    <div className="p-6 rounded-2xl bg-white/90 border border-blue-100 shadow-sm hover:shadow-md transition">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">{title}</h3>
      <p className="text-gray-700 text-sm leading-relaxed">{description}</p>
    </div>
  );
}