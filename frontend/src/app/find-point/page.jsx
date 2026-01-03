"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Header from "@/app/components/Header";
import api from "@/axios/api";

// Dynamic import for Map
const PublicPostmatMap = dynamic(() => import("@/app/components/PublicPostmatMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400">
      Loading Map...
    </div>
  ),
});

export default function FindPointPage() {
  const [allPoints, setAllPoints] = useState([]); // Stores ALL fetched points for Map
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  // Client-Side Pagination State
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Hydration Fix: Wait for mount before rendering complex UI
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchPoints = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (sortBy) params.append("ordering", sortBy);
        
        // Fetch a large batch so Map shows the whole network context
        // while we paginate the list client-side
        params.append("page_size", 2000); 

        const res = await api.get(`/api/postmats/public/points/?${params.toString()}`);
        setAllPoints(res.data.results || res.data || []);
        setPage(1); // Reset to page 1 on new search
      } catch (err) {
        console.error("Failed to load points", err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => fetchPoints(), 300);
    return () => clearTimeout(timeoutId);
  }, [search, sortBy]);

  // Client-Side Pagination Logic
  const paginatedList = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return allPoints.slice(startIndex, startIndex + pageSize);
  }, [allPoints, page]);

  const totalPages = Math.ceil(allPoints.length / pageSize);

  // Prevent Hydration Mismatch by rendering a shell until mounted
  if (!isMounted) return null;

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-black overflow-hidden">
      <Header />
      
      {/* Main Content Area - Fixed Height to prevent full page scroll */}
      <div className="flex-1 flex flex-col md:flex-row h-full relative mt-16 overflow-hidden">
        
        {/* LEFT PANEL: Sidebar List */}
        <div className="w-full md:w-96 flex flex-col bg-white border-r border-gray-200 shadow-xl z-20 h-full">
            
            {/* Search & Filter Header */}
            <div className="p-5 border-b border-gray-100 bg-white shrink-0 z-10">
                <h1 className="text-xl font-bold text-gray-900 mb-1">Find a Point</h1>
                <p className="text-xs text-gray-500 mb-4">Search our network of lockers</p>
                
                <div className="space-y-3">
                    {/* Search Input */}
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="City, street, or code..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:bg-white text-sm transition-all"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>

                    {/* Sort Dropdown */}
                    <select 
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
                    >
                        <option value="name">Sort by Name (A-Z)</option>
                        <option value="-name">Sort by Name (Z-A)</option>
                        <option value="warehouse__city">Sort by City (A-Z)</option>
                    </select>
                </div>
            </div>

            {/* Scrollable List Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                        <span className="text-xs font-medium">Scanning map...</span>
                    </div>
                ) : allPoints.length === 0 ? (
                    <div className="text-center py-12 px-6">
                        <div className="inline-block p-3 rounded-full bg-gray-100 mb-3 text-gray-400">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">No points found</h3>
                        <p className="text-xs text-gray-500 mt-1">Try changing your search terms.</p>
                    </div>
                ) : (
                    paginatedList.map(point => (
                        <div 
                            key={point.id} 
                            onClick={() => setSelectedPoint(point)}
                            className={`flex gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200
                                ${selectedPoint?.id === point.id 
                                    ? 'bg-white border-yellow-400 shadow-md ring-1 ring-yellow-400 scale-[1.02]' 
                                    : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-sm'
                                }
                            `}
                        >
                            {/* Image / Icon */}
                            <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 relative">
                                {point.image ? (
                                    <img src={point.image} alt={point.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className={`w-full h-full flex items-center justify-center text-xl font-bold
                                        ${selectedPoint?.id === point.id ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}
                                    `}>
                                        P
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-sm text-gray-900 truncate pr-2">{point.name}</h3>
                                    <span className="text-[10px] font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                                        {point.postal_code}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                                    {point.address || `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            {/* List Footer / Pagination Controls */}
            <div className="p-3 border-t border-gray-200 bg-white shrink-0 z-10">
                <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-500">
                        Showing {Math.min(allPoints.length, (page - 1) * pageSize + 1)}-{Math.min(allPoints.length, page * pageSize)} of {allPoints.length}
                    </span>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex-1 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                    >
                        Previous
                    </button>
                    <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="flex-1 py-2 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>

        {/* RIGHT PANEL: Map */}
        <div className="flex-1 bg-gray-200 relative h-full">
            <PublicPostmatMap points={allPoints} selectedPoint={selectedPoint} />
        </div>

      </div>
    </div>
  );
}