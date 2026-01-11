"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/axios/api";

// Components
import ParcelTimeline from "@/app/components/ParcelTimeline";

// Dynamic Map import
const ParcelMap = dynamic(() => import('@/app/components/ParcelMapSendPackage'), {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">Loading Map...</div>,
});

export default function IncomingParcelsView() {
    // Data State
    const [parcels, setParcels] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // UI State
    const [selectedParcel, setSelectedParcel] = useState(null); // Full detail object
    const [detailLoading, setDetailLoading] = useState(false);
    const [postmatLocation, setPostmatLocation] = useState(null);
    const [banner, setBanner] = useState({ msg: "", type: "" });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await api.get("/api/packages/user/incoming/");
            setParcels(res.data);
            
            // If a parcel is selected, refresh its details too
            if (selectedParcel) {
                const updatedParcel = res.data.find(p => p.id === selectedParcel.id);
                if (updatedParcel) {
                    handleViewDetails(updatedParcel, true); 
                }
            }
        } catch (e) {
            console.error("Failed to load incoming parcels", e);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const handleViewDetails = async (parcel, refresh = false) => {
        if (!refresh && selectedParcel?.id === parcel.id) {
            setSelectedParcel(null); 
            return;
        }

        setDetailLoading(true);
        if (!refresh) {
            setSelectedParcel({ ...parcel, actualizations: [] }); 
            setPostmatLocation(null);
        }
        
        try {
            const res = await api.get(`/api/packages/details/${parcel.id}/`);
            const details = res.data;
            setSelectedParcel(details);
            
            if (details.destination_postmat_lat && details.destination_postmat_long) {
                setPostmatLocation({
                    lat: parseFloat(details.destination_postmat_lat),
                    lng: parseFloat(details.destination_postmat_long),
                });
            } else {
                setPostmatLocation(null);
            }
        } catch (error) {
            console.error(error);
            showBanner("Failed to load package details", "error");
        } finally {
            setDetailLoading(false);
        }
    };

    const handleOpenStash = async (packageId) => {
        if(!confirm("Are you at the locker? Open it now?")) return;
        try {
            const res = await api.post(`/api/packages/collect/${packageId}/`);
            showBanner(res.data.message || "Package collected successfully!", "success");
            loadData();
        } catch (error) {
            showBanner(error.response?.data?.error || "Failed to collect package.", "error");
        }
    };

    const showBanner = (msg, type) => {
        setBanner({ msg, type });
        setTimeout(() => setBanner({ msg: "", type: "" }), 5000);
    };

    // --- Render Helpers ---

    const getStatusBadge = (status) => {
        const styles = {
            created: "bg-blue-100 text-blue-800",
            waiting_for_pickup: "bg-purple-100 text-purple-800",
            in_transit: "bg-yellow-100 text-yellow-800",
            in_warehouse: "bg-orange-100 text-orange-800",
            placed_in_stash: "bg-green-100 text-green-800",
            delivered: "bg-green-100 text-green-800",
            cancelled: "bg-red-100 text-red-800",
        };
        const safeStatus = status || 'unknown';
        return (
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${styles[safeStatus] || "bg-gray-100"}`}>
                {safeStatus.replace(/_/g, " ")}
            </span>
        );
    };

    if (loading) return <div className="text-center py-20 text-gray-500">Loading incoming parcels...</div>;

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-end mb-6 pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        Incoming Shipments
                        <span className="bg-purple-100 text-purple-700 text-sm px-2 py-1 rounded-full">{parcels.length}</span>
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Track packages sent to you.</p>
                </div>
            </div>

            {banner.msg && (
                <div className={`mb-6 p-4 rounded-xl text-white font-medium shadow-md animate-fade-in ${banner.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {banner.msg}
                </div>
            )}

            {parcels.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                    <div className="text-6xl mb-4">📬</div>
                    <p className="text-gray-500 text-lg font-medium">No incoming packages found.</p>
                    <p className="text-gray-400 text-sm">Packages sent to your email will appear here.</p>
                </div>
            ) : (
                <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px]">
                    
                    {/* LEFT COLUMN: List */}
                    <div className={`flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-thin transition-all duration-300 ${selectedParcel ? 'lg:w-5/12' : 'w-full'}`}>
                        {parcels.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => handleViewDetails(p)}
                                className={`
                                    p-5 rounded-2xl border cursor-pointer transition-all duration-200 group relative
                                    ${selectedParcel?.id === p.id 
                                    ? "bg-purple-50/50 border-purple-500 shadow-md ring-1 ring-purple-200" 
                                    : "bg-white border-gray-100 hover:border-purple-200 hover:shadow-lg"} 
                                `}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${selectedParcel?.id === p.id ? 'bg-purple-100 text-purple-600' : 'bg-gray-50 text-gray-500 group-hover:bg-purple-50 group-hover:text-purple-500'}`}>
                                            📥
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{p.sender_name || "Unknown Sender"}</p>
                                            <p className="text-xs text-gray-500 font-mono">{p.pickup_code.slice(0, 8)}...</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {getStatusBadge(p.latest_status)}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center text-sm text-gray-600 border-t border-gray-100 pt-3 mt-2">
                                    <span className="truncate max-w-[200px]">{p.origin_postmat_name} ➔ {p.destination_postmat_name}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* RIGHT COLUMN: Details */}
                    {selectedParcel && (
                        <div className="lg:w-7/12 animate-slide-in-right">
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden sticky top-4 h-full flex flex-col max-h-[85vh]">
                                
                                {/* Header */}
                                <div className="bg-gray-900 text-white px-8 py-6 flex justify-between items-center shrink-0">
                                    <div>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Tracking ID</p>
                                        <p className="font-mono text-xl">{selectedParcel.pickup_code}</p>
                                    </div>
                                    <button onClick={() => setSelectedParcel(null)} className="text-gray-400 hover:text-white transition p-2 hover:bg-white/10 rounded-lg">✕</button>
                                </div>

                                <div className="p-8 overflow-y-auto flex-1 space-y-8 scrollbar-thin">
                                
                                    {/* Action Banner: PICKUP */}
                                    {selectedParcel.is_ready_for_pickup && (
                                        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center shadow-inner">
                                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">🔓</div>
                                            <h4 className="text-green-800 font-bold text-lg mb-1">Package Arrived!</h4>
                                            <p className="text-green-600 mb-4 text-sm">The package is waiting for you at the destination locker.</p>
                                            <button onClick={() => handleOpenStash(selectedParcel.id)} className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg transition transform hover:scale-105 active:scale-95 w-full md:w-auto">
                                                Open Locker & Pickup
                                            </button>
                                        </div>
                                    )}

                                    {/* Info Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Details</p>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Size:</span>
                                                    <span className="font-semibold text-gray-900 capitalize">{selectedParcel.size_display || selectedParcel.size}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500">Weight:</span>
                                                    <span className="font-semibold text-gray-900">{selectedParcel.weight} kg</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                                            <p className="text-xs font-bold text-purple-400 uppercase mb-2">Pickup Code</p>
                                            {selectedParcel.unlock_code ? (
                                                <div className="text-center">
                                                    <p className="font-mono text-xl font-bold text-purple-900 tracking-wider">{selectedParcel.unlock_code}</p>
                                                    <p className="text-[10px] text-purple-400 mt-1">Use this code or app to open</p>
                                                </div>
                                            ) : (
                                                <div className="h-full flex items-center justify-center">
                                                    <p className="text-purple-300 italic text-xs">Available upon delivery</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Map */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pickup Location</h4>
                                        {postmatLocation ? (
                                            <div className="h-48 w-full rounded-2xl border border-gray-200 overflow-hidden shadow-sm relative z-0">
                                                <ParcelMap location={postmatLocation} />
                                            </div>
                                        ) : (
                                            <div className="h-24 bg-gray-50 rounded-2xl flex items-center justify-center border border-dashed border-gray-300 text-gray-400 text-sm">
                                                Location map unavailable
                                            </div>
                                        )}
                                    </div>

                                    {/* Timeline */}
                                    <div className="pt-4 border-t border-gray-100">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6">Tracking History</h4>
                                        <ParcelTimeline actualizations={selectedParcel.actualizations} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}