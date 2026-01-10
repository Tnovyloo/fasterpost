"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import api from "@/axios/api";
// Added icons for the business section
import { Building2, Briefcase, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function Page() {
  const [query, setQuery] = useState("");
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
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
      const res = await api.get(`/api/packages/public/track/${query}/`);
      setPackageData(res.data);
    } catch (err) {
      setError(err.response?.status === 404 ? "Package not found." : "System error.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const map = {
      'created': { label: 'Registered', color: 'bg-gray-100 text-gray-600' },
      'delivered': { label: 'Delivered', color: 'bg-green-50 text-green-700' },
      // ... rest of your map
    };
    return map[status] || { label: status, color: 'bg-gray-50' };
  };

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="max-w-4xl w-full text-center">
          
          {/* --- HERO SECTION --- */}
          <div className="flex justify-center mb-6">
            <img src="/file.svg" alt="Logo" className="w-24 h-24 drop-shadow-md" />
          </div>

          <h1 className="text-4xl md:text-6xl font-black text-blue-900 mb-4 tracking-tight">
            FasterPost
          </h1>
          <p className="text-lg text-gray-600 mb-10 max-w-xl mx-auto font-medium">
            The next generation of logistics. Track, send, and manage parcels with ease.
          </p>

          {/* --- TRACKING INPUT --- */}
          <div className="bg-white p-2 rounded-2xl shadow-2xl border border-blue-100 max-w-xl mx-auto mb-12">
            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter Tracking ID..."
                className="flex-1 px-6 py-4 rounded-xl text-lg outline-none font-mono"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg"
              >
                {loading ? "..." : "Track"}
              </button>
            </form>
          </div>

          {/* --- BUSINESS CALL TO ACTION (NEW) --- */}
          <div className="max-w-3xl mx-auto mb-16">
            <div className="relative overflow-hidden bg-indigo-900 rounded-3xl p-8 text-left shadow-2xl group">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-400/30 transition-all" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20">
                  <Building2 className="w-10 h-10 text-yellow-400" />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">Scale your business with FasterPost</h3>
                  <p className="text-indigo-200 text-sm leading-relaxed">
                    Get access to bulk shipping discounts, API integration, and automated CEIDG verification. 
                    Apply for a corporate account today.
                  </p>
                </div>

                <Link 
                  href="/business" 
                  className="whitespace-nowrap flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold transition-transform active:scale-95"
                >
                  Start Business <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* --- TRACKING RESULTS (Your existing logic) --- */}
          {packageData && (
             <div className="mb-12 animate-in fade-in slide-in-from-bottom-4">
                {/* ... your existing package result JSX ... */}
             </div>
          )}

          {/* --- LOGIN/REGISTER ACTIONS --- */}
          {!isLoggedIn && (
            <div className="flex flex-wrap justify-center gap-4">
               <Link href="/login" className="px-10 py-4 bg-white text-gray-900 border-2 border-gray-100 rounded-2xl font-bold hover:bg-gray-50 transition">
                 Sign In
               </Link>
               <Link href="/register" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:shadow-lg transition">
                 Join FasterPost
               </Link>
            </div>
          )}
        </div>
      </main>

      {/* --- BUSINESS FEATURES GRID (UPDATED) --- */}
      <section className="bg-white py-20 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-900 mb-4">Why Businesses choose us?</h2>
            <div className="h-1.5 w-20 bg-blue-600 mx-auto rounded-full" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Feature
              icon={<Zap className="w-6 h-6 text-yellow-500" />}
              title="Automated NIP Verification"
              description="We sync directly with CEIDG to verify your business details in real-time."
            />
            <Feature
              icon={<ShieldCheck className="w-6 h-6 text-green-500" />}
              title="Reliable Logistics"
              description="Full insurance coverage for B2B shipments and dedicated account managers."
            />
            <Feature
              icon={<Briefcase className="w-6 h-6 text-blue-500" />}
              title="Bulk Shipping"
              description="Upload thousands of orders via CSV or API and generate labels instantly."
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Feature({ icon, title, description }) {
  return (
    <div className="p-8 rounded-3xl bg-gray-50 hover:bg-white border-2 border-transparent hover:border-blue-100 transition shadow-sm hover:shadow-xl group">
      <div className="mb-4 inline-block">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}