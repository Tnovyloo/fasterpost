"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/app/components/Header";
import AddressDisplay from "@/app/components/AddressDisplay";
import api from "@/axios/api";

// --- Icons ---
const TruckIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const PackageIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
);
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);
const MapPinIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);

// --- Helper: Collapsible Package List ---
const PackageDropdown = ({ type, packages }) => {
  if (!packages || packages.length === 0) return null;

  const isPickup = type === 'pickup';
  const theme = isPickup 
    ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', hover: 'hover:bg-amber-100' }
    : { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', hover: 'hover:bg-blue-100' };

  return (
    <details className={`rounded-lg border ${theme.border} ${theme.bg} overflow-hidden group mb-2`}>
      <summary className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none transition-colors ${theme.hover}`}>
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${theme.text}`}>
          <span className="text-lg">{isPickup ? '⬆' : '⬇'}</span>
          <span>{isPickup ? 'Pickups' : 'Dropoffs'}</span>
          <span className="bg-white/60 px-2 py-0.5 rounded-full ml-1 border border-black/5">{packages.length}</span>
        </div>
        <svg className={`w-4 h-4 ${theme.text} transform transition-transform duration-200 group-open:rotate-180`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      
      <div className="px-4 pb-4 pt-1 space-y-2">
        {packages.map(pkg => (
          <div key={pkg.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 shadow-sm text-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isPickup ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                <PackageIcon />
              </div>
              <div className="flex flex-col">
                <span className="font-mono font-bold text-gray-800">
                   {pkg.pickup_code ? pkg.pickup_code : `PKG-${pkg.id.slice(0,6)}`}
                </span>
                <span className="text-xs text-gray-500 font-medium capitalize">{pkg.size} Size</span>
              </div>
            </div>
            {pkg.weight && <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">{pkg.weight}kg</span>}
          </div>
        ))}
      </div>
    </details>
  );
};

export default function CourierDashboard() {
  const API_BASE = "/api/courier/routes";

  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  const getAuthConfig = () => {
    const token = getToken();
    return token ? { headers: { Authorization: `Token ${token}` } } : {};
  };

  const fetchCurrentRoute = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API_BASE}/current/`, getAuthConfig());
      setRoute(res.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setRoute(null);
      } else {
        setError("Failed to load route data. Please try refreshing.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentRoute();
  }, [fetchCurrentRoute]);

  const handleStartRoute = async () => {
    if (!confirm("Are you ready to start your shift?")) return;
    setActionLoading(true);
    try {
      await api.post(`${API_BASE}/${route.id}/start/`, {}, getAuthConfig());
      await fetchCurrentRoute();
    } catch (err) {
      alert("Error starting route");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteStop = async (stopId) => {
    if (!confirm("Confirm you have finished all tasks at this location?")) return;
    setActionLoading(true);
    try {
      await api.post(`${API_BASE}/${route.id}/complete-stop/${stopId}/`, {}, getAuthConfig());
      await fetchCurrentRoute();
    } catch (err) {
      alert(err.response?.data?.error || "Error completing stop");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinishRoute = async () => {
    if (!confirm("Finish route and end day?")) return;
    setActionLoading(true);
    try {
      await api.post(`${API_BASE}/${route.id}/finish/`, {}, getAuthConfig());
      await fetchCurrentRoute();
    } catch (err) {
      alert("Error finishing route");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !route) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-indigo-600"></div>
          <p className="text-gray-500 font-medium">Loading itinerary...</p>
        </div>
      </div>
    );
  }

  // Calculate Progress
  const totalStops = route?.stops?.length || 0;
  const completedStops = route?.stops?.filter(s => s.completed_at).length || 0;
  const progressPercent = totalStops === 0 ? 0 : (completedStops / totalStops) * 100;
  const nextStopIndex = route?.stops?.findIndex(s => !s.completed_at);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <Header />
      
      <div className="max-w-3xl mx-auto space-y-6 mt-16 md:mt-20">
        
        {/* HEADER CARD */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Courier Dashboard</h1>
              <p className="text-gray-500 font-medium mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            {route && (
              <div className="flex items-center gap-3">
                 <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm border ${
                    route.status === 'completed' ? 'bg-green-100 text-green-800 border-green-200' :
                    route.status === 'in_progress' ? 'bg-indigo-100 text-indigo-800 border-indigo-200 animate-pulse' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                 }`}>
                   {route.status.replace('_', ' ').toUpperCase()}
                 </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm font-medium">
            {error}
          </div>
        )}

        {/* NO ROUTE STATE */}
        {!route && !loading && !error && (
           <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
             <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
               <TruckIcon />
             </div>
             <h3 className="text-2xl font-bold text-gray-900">No active route</h3>
             <p className="text-gray-500 mt-2 font-medium">You don't have any routes scheduled for today yet.</p>
           </div>
        )}

        {/* ACTIVE ROUTE VIEW */}
        {route && (
          <>
            {/* STATS & ACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stats */}
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Route Progress</span>
                  <span className="text-2xl font-bold text-indigo-600">{completedStops}/{totalStops}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm font-medium text-gray-600 pt-2 border-t border-gray-100">
                   <div className="flex flex-col">
                     <span className="text-xs text-gray-400 uppercase">Distance</span>
                     <span className="text-gray-900">{route.total_distance} km</span>
                   </div>
                   <div className="flex flex-col text-right">
                     <span className="text-xs text-gray-400 uppercase">Est. Time</span>
                     <span className="text-gray-900">{Math.floor(route.estimated_duration / 60)}h {route.estimated_duration % 60}m</span>
                   </div>
                </div>
              </div>

              {/* Main Action Button */}
              <div className="bg-white rounded-xl shadow border border-gray-200 p-6 flex items-center justify-center">
                 {route.status === 'planned' && (
                    <button 
                      onClick={handleStartRoute}
                      disabled={actionLoading}
                      className="w-full h-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition transform active:scale-95 disabled:opacity-50 disabled:scale-100 text-lg tracking-wide"
                    >
                      {actionLoading ? "Starting..." : "START ROUTE"}
                    </button>
                 )}
                 
                 {route.status === 'in_progress' && completedStops < totalStops && (
                    <div className="text-center w-full">
                      <p className="text-xs font-bold text-gray-400 uppercase mb-2">Current Destination</p>
                      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3">
                        <h3 className="text-xl font-bold text-indigo-900 truncate">
                          {route.stops[nextStopIndex]?.warehouse?.city}
                        </h3>
                      </div>
                    </div>
                 )}

                 {route.status === 'in_progress' && completedStops === totalStops && (
                    <button 
                      onClick={handleFinishRoute}
                      disabled={actionLoading}
                      className="w-full h-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition transform active:scale-95 disabled:opacity-50 disabled:scale-100 text-lg tracking-wide"
                    >
                      {actionLoading ? "Finishing..." : "FINISH DAY"}
                    </button>
                 )}

                 {route.status === 'completed' && (
                    <div className="text-center text-green-600 flex flex-col items-center">
                      <div className="p-3 bg-green-100 rounded-full mb-2">
                        <CheckIcon />
                      </div>
                      <span className="font-bold text-lg">Route Completed</span>
                    </div>
                 )}
              </div>
            </div>

            {/* STOPS TIMELINE */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
               <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                 <h2 className="text-lg font-bold text-gray-800">Itinerary</h2>
               </div>
               <div className="p-6">
                  <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-200 before:z-0">
                    
                    {route.stops.map((stop, index) => {
                       const isCompleted = !!stop.completed_at;
                       const isNext = !isCompleted && index === nextStopIndex;
                       const isPending = !isCompleted && !isNext;

                       return (
                         <div key={stop.id} className={`relative flex items-start gap-4 ${isPending ? 'opacity-50 grayscale transition-opacity hover:opacity-100' : ''}`}>
                            
                            {/* Timeline Dot */}
                            <div className={`
                               relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0 border-4 transition-all duration-300
                               ${isCompleted ? 'bg-green-100 border-green-500 text-green-700' : ''}
                               ${isNext ? 'bg-white border-indigo-600 text-indigo-700 shadow-lg scale-110' : ''}
                               ${isPending ? 'bg-white border-gray-300 text-gray-400' : ''}
                            `}>
                               {isCompleted ? <CheckIcon /> : <span className="text-sm font-bold">{index + 1}</span>}
                            </div>

                            {/* Card Content */}
                            <div className={`
                               flex-1 rounded-xl border p-5 transition-all duration-300
                               ${isNext ? 'bg-indigo-50/40 border-indigo-200 shadow-md ring-1 ring-indigo-100' : 'bg-white border-gray-200 hover:border-gray-300'}
                            `}>
                               <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-2">
                                 <div>
                                   <h3 className={`font-bold text-lg ${isNext ? 'text-indigo-900' : 'text-gray-900'}`}>
                                     {stop.warehouse.city}
                                   </h3>
                                   <div className="flex items-center text-sm text-gray-600 mt-1 font-medium">
                                      <MapPinIcon />
                                      {/* Integrated Address Display */}
                                      <AddressDisplay lat={stop.warehouse.latitude} lon={stop.warehouse.longitude} />
                                   </div>
                                 </div>
                                 
                                 {isCompleted && (
                                   <span className="text-xs font-bold bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-200 whitespace-nowrap self-start">
                                     Done at {new Date(stop.completed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                   </span>
                                 )}
                               </div>

                               {/* Dropdown Packages Section */}
                               <div className="space-y-2">
                                 <PackageDropdown type="pickup" packages={stop.pickups} />
                                 <PackageDropdown type="dropoff" packages={stop.dropoffs} />

                                 {/* Helper if nothing to do */}
                                 {stop.pickups.length === 0 && stop.dropoffs.length === 0 && (
                                    <div className="text-center py-3 bg-gray-50 rounded border border-gray-100 border-dashed">
                                      <p className="text-sm text-gray-400 font-medium italic">No package exchange scheduled.</p>
                                    </div>
                                 )}
                               </div>

                               {/* Action Button for THIS stop */}
                               {isNext && route.status === 'in_progress' && (
                                 <div className="mt-4 pt-4 border-t border-indigo-100">
                                   <button
                                     onClick={() => handleCompleteStop(stop.id)}
                                     disabled={actionLoading}
                                     className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-md active:scale-95 flex items-center justify-center gap-2"
                                   >
                                     {actionLoading ? (
                                       <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                                     ) : (
                                       <CheckIcon />
                                     )}
                                     Mark Stop as Completed
                                   </button>
                                 </div>
                               )}
                            </div>
                         </div>
                       );
                    })}

                  </div>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}