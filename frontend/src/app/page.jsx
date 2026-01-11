"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import api from "@/axios/api";
// Added icons for the business section
import { Building2, Briefcase, ArrowRight, ShieldCheck, Zap, Search, Package, MapPin, Clock, ChevronDown, ChevronUp } from "lucide-react";

export default function Page() {
  const [query, setQuery] = useState("");
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // FAQ State
  const [openFaq, setOpenFaq] = useState(null);

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

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  }

  if (!isMounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans text-gray-900">
      <Header />

      <main className="flex-1">
        
        {/* --- HERO SECTION --- */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-white -z-10" />
            
            <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wide mb-6 animate-fade-in-up">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                    Next Gen Logistics
                </div>

                <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 tracking-tight leading-tight animate-fade-in-up delay-100">
                    Shipping made <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Simple & Fast.</span>
                </h1>
                
                <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up delay-200">
                    Send packages between automated lockers 24/7. No queues, no paperwork, just speed.
                </p>

                {/* Tracking Input */}
                <div className="max-w-2xl mx-auto mb-12 animate-fade-in-up delay-300 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-white p-2 rounded-2xl shadow-xl border border-gray-100 flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <form onSubmit={handleTrack} className="w-full">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Enter Tracking ID (e.g. PKG-123456)"
                                    className="w-full pl-12 pr-4 py-4 rounded-xl text-lg outline-none font-medium text-gray-900 placeholder-gray-400 bg-transparent"
                                />
                            </form>
                        </div>
                        <button
                            onClick={handleTrack}
                            disabled={loading}
                            className="bg-gray-900 hover:bg-gray-800 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Track Package <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>
                </div>

                {/* Tracking Results */}
                {error && (
                    <div className="max-w-md mx-auto mb-8 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 font-medium animate-in fade-in slide-in-from-bottom-2">
                        {error}
                    </div>
                )}

                {packageData && (
                    <div className="max-w-2xl mx-auto mb-16 text-left bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tracking ID</p>
                                <p className="text-xl font-mono font-bold text-gray-900">{packageData.pickup_code}</p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                packageData.latest_status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                                {packageData.latest_status?.replace(/_/g, " ")}
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-gray-500 mb-1">From</p>
                                <p className="font-bold text-gray-900">{packageData.origin_postmat_name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-500 mb-1">To</p>
                                <p className="font-bold text-gray-900">{packageData.destination_postmat_name}</p>
                            </div>
                        </div>
                        {/* Simple Progress Bar */}
                        <div className="px-6 pb-8">
                             <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-1000" 
                                    style={{ width: packageData.latest_status === 'delivered' ? '100%' : packageData.latest_status === 'created' ? '10%' : '50%' }}
                                ></div>
                             </div>
                             <p className="text-xs text-center text-gray-400">
                                {packageData.latest_status === 'delivered' ? 'Package Delivered' : 'In Transit'}
                             </p>
                        </div>
                    </div>
                )}

                {/* Auth Buttons */}
                {!isLoggedIn && (
                    <div className="flex flex-wrap justify-center gap-4 animate-fade-in-up delay-500">
                        <Link href="/register" className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 hover:shadow-xl hover:-translate-y-0.5">
                            Create Free Account
                        </Link>
                        <Link href="/login" className="px-8 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-bold hover:bg-gray-50 transition hover:border-gray-300">
                            Sign In
                        </Link>
                    </div>
                )}
            </div>
        </section>

        {/* --- HOW IT WORKS (FAQ) --- */}
        <section className="py-24 bg-gray-50 border-y border-gray-100">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">How FasterPost Works</h2>
                    <p className="text-gray-600 max-w-xl mx-auto">Everything you need to know about our automated delivery system.</p>
                </div>

                <div className="space-y-4">
                    <FaqItem 
                        question="How do I send a package?" 
                        answer="It's simple! Create an account, click 'Send Package', select a source and destination locker on the map, and pay online. You'll get a code to drop off your item at the selected locker."
                        isOpen={openFaq === 0}
                        onClick={() => toggleFaq(0)}
                    />
                    <FaqItem 
                        question="What are Postmats?" 
                        answer="Postmats are our automated parcel lockers available 24/7. You can drop off or pick up packages at any time that suits you, without waiting for a courier at home."
                        isOpen={openFaq === 1}
                        onClick={() => toggleFaq(1)}
                    />
                    <FaqItem 
                        question="How long does delivery take?" 
                        answer="Most shipments between major cities are delivered within 24-48 hours. Our optimized logistics network ensures your package takes the fastest route through our hubs."
                        isOpen={openFaq === 2}
                        onClick={() => toggleFaq(2)}
                    />
                    <FaqItem 
                        question="Is my package insured?" 
                        answer="Yes, all standard shipments include basic insurance. Business accounts get access to extended coverage and priority support."
                        isOpen={openFaq === 3}
                        onClick={() => toggleFaq(3)}
                    />
                     <FaqItem 
                        question="Can I track my package?" 
                        answer="Absolutely. Use the tracking bar at the top of this page with your unique Tracking ID to see real-time status updates."
                        isOpen={openFaq === 4}
                        onClick={() => toggleFaq(4)}
                    />
                    <FaqItem 
                        question="What are the package size limits?" 
                        answer="We support three locker sizes: Small (8 x 38 x 64 cm), Medium (19 x 38 x 64 cm), and Large (41 x 38 x 64 cm). Please ensure your package fits within these dimensions."
                        isOpen={openFaq === 5}
                        onClick={() => toggleFaq(5)}
                    />
                </div>
            </div>
        </section>

        {/* --- BUSINESS SECTION --- */}
        <section className="py-24 px-6">
            <div className="max-w-6xl mx-auto">
                <div className="bg-gray-900 rounded-3xl p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                        <div className="flex-1 text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-blue-300 text-xs font-bold uppercase tracking-wide mb-6">
                                For Enterprise
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">Scale your business with FasterPost</h2>
                            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                Get access to bulk shipping discounts, API integration for your e-commerce store, and automated CEIDG verification. 
                                Join thousands of businesses shipping smarter.
                            </p>
                            <Link 
                                href="/business" 
                                className="inline-flex items-center gap-2 bg-white text-gray-900 px-8 py-4 rounded-xl font-bold hover:bg-gray-100 transition shadow-lg active:scale-95"
                            >
                                Open Business Account <ArrowRight className="w-5 h-5" />
                            </Link>
                        </div>
                        
                        {/* Feature Grid */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:bg-white/20 transition">
                                <Zap className="w-8 h-8 text-yellow-400 mb-4" />
                                <h3 className="font-bold text-lg mb-2">Fast Delivery</h3>
                                <p className="text-sm text-gray-400">Next-day delivery options for business partners.</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:bg-white/20 transition">
                                <ShieldCheck className="w-8 h-8 text-green-400 mb-4" />
                                <h3 className="font-bold text-lg mb-2">Secure Handling</h3>
                                <p className="text-sm text-gray-400">Full insurance and secure locker network.</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:bg-white/20 transition">
                                <Briefcase className="w-8 h-8 text-blue-400 mb-4" />
                                <h3 className="font-bold text-lg mb-2">Bulk Tools</h3>
                                <p className="text-sm text-gray-400">CSV upload and API access for mass shipping.</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10 hover:bg-white/20 transition">
                                <Building2 className="w-8 h-8 text-purple-400 mb-4" />
                                <h3 className="font-bold text-lg mb-2">Verified</h3>
                                <p className="text-sm text-gray-400">Instant NIP/CEIDG verification for companies.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

function FaqItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-md">
        <button 
            onClick={onClick}
            className="w-full px-6 py-5 text-left flex justify-between items-center gap-4 focus:outline-none"
        >
            <span className="font-bold text-lg text-gray-900">{question}</span>
            {isOpen ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        <div 
            className={`px-6 text-gray-600 leading-relaxed overflow-hidden transition-all duration-300 ${
                isOpen ? "max-h-48 pb-6 opacity-100" : "max-h-0 opacity-0"
            }`}
        >
            {answer}
        </div>
    </div>
  );
}