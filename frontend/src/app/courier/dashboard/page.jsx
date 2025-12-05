"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/app/components/Header";
import api from "@/axios/api";

// --- Helper Components for Icons ---
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

export default function CourierDashboard() {
  const API_BASE = "/api/courier/routes";

  // State
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auth Helper
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  const getAuthConfig = () => {
    const token = getToken();
    return token ? { headers: { Authorization: `Token ${token}` } } : {};
  };

  // Fetch Route
  const fetchCurrentRoute = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API_BASE}/current/`, getAuthConfig());
      setRoute(res.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setRoute(null); // No route found is a valid state
      } else {
        setError("Failed to load route data.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentRoute();
  }, [fetchCurrentRoute]);

  // Actions
  const handleStartRoute = async () => {
    if (!confirm("Are you ready to start your shift?")) return;
    setActionLoading(true);
    try {
      await api.post(`${API_BASE}/${route.id}/start/`, {}, getAuthConfig());
      await fetchCurrentRoute(); // Refresh data
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

  // Render Logic
  if (loading && !route) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Calculate Progress
  const totalStops = route?.stops?.length || 0;
  const completedStops = route?.stops?.filter(s => s.completed_at).length || 0;
  const progressPercent = totalStops === 0 ? 0 : (completedStops / totalStops) * 100;
  const nextStopIndex = route?.stops?.findIndex(s => !s.completed_at);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <Header />
      
      <div className="max-w-3xl mx-auto space-y-6 mt-6">
        
        {/* HEADER CARD */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Courier Dashboard</h1>
              <p className="text-gray-500 text-sm mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            
            {route && (
              <div className="flex items-center gap-3">
                 <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
                    route.status === 'completed' ? 'bg-green-100 text-green-800' :
                    route.status === 'in_progress' ? 'bg-indigo-100 text-indigo-800 animate-pulse' :
                    'bg-gray-100 text-gray-800'
                 }`}>
                   {route.status.replace('_', ' ').toUpperCase()}
                 </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* NO ROUTE STATE */}
        {!route && !loading && !error && (
           <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
             <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
               <TruckIcon />
             </div>
             <h3 className="text-xl font-semibold text-gray-900">No active route</h3>
             <p className="text-gray-500 mt-2">You don't have any routes scheduled for today yet.</p>
           </div>
        )}

        {/* ACTIVE ROUTE VIEW */}
        {route && (
          <>
            {/* STATS & ACTIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Stats */}
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-medium text-gray-500">Route Progress</span>
                  <span className="text-lg font-bold text-indigo-600">{completedStops}/{totalStops} Stops</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="mt-4 flex justify-between text-sm text-gray-600">
                   <span>Dist: {route.total_distance} km</span>
                   <span>Est: {Math.floor(route.estimated_duration / 60)}h {route.estimated_duration % 60}m</span>
                </div>
              </div>

              {/* Main Action Button */}
              <div className="bg-white rounded-xl shadow-sm border p-5 flex items-center justify-center">
                 {route.status === 'planned' && (
                    <button 
                      onClick={handleStartRoute}
                      disabled={actionLoading}
                      className="w-full h-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow transition transform active:scale-95 disabled:opacity-50"
                    >
                      {actionLoading ? "Starting..." : "START ROUTE"}
                    </button>
                 )}
                 
                 {route.status === 'in_progress' && completedStops < totalStops && (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-1">Current Task</p>
                      <h3 className="text-lg font-bold text-gray-900">
                        Drive to {route.stops[nextStopIndex]?.warehouse?.city}
                      </h3>
                    </div>
                 )}

                 {route.status === 'in_progress' && completedStops === totalStops && (
                    <button 
                      onClick={handleFinishRoute}
                      disabled={actionLoading}
                      className="w-full h-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition transform active:scale-95 disabled:opacity-50"
                    >
                      {actionLoading ? "Finishing..." : "FINISH DAY"}
                    </button>
                 )}

                 {route.status === 'completed' && (
                    <div className="text-center text-green-600">
                      <CheckIcon />
                      <span className="font-bold">Route Completed</span>
                    </div>
                 )}
              </div>
            </div>

            {/* STOPS TIMELINE */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
               <div className="px-6 py-4 bg-gray-50 border-b">
                 <h2 className="font-semibold text-gray-900">Itinerary</h2>
               </div>
               <div className="p-6">
                  <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-200 before:z-0">
                    
                    {route.stops.map((stop, index) => {
                       const isCompleted = !!stop.completed_at;
                       const isNext = !isCompleted && index === nextStopIndex;
                       const isPending = !isCompleted && !isNext;

                       return (
                         <div key={stop.id} className={`relative flex items-start gap-4 ${isPending ? 'opacity-60 grayscale' : ''}`}>
                            
                            {/* Timeline Dot */}
                            <div className={`
                               relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0 border-4 transition-colors
                               ${isCompleted ? 'bg-green-100 border-green-500 text-green-600' : ''}
                               ${isNext ? 'bg-white border-indigo-600 text-indigo-600 shadow-lg scale-110' : ''}
                               ${isPending ? 'bg-white border-gray-300 text-gray-400' : ''}
                            `}>
                               {isCompleted ? <CheckIcon /> : <span className="text-sm font-bold">{index + 1}</span>}
                            </div>

                            {/* Card Content */}
                            <div className={`
                               flex-1 rounded-lg border p-4 transition-all
                               ${isNext ? 'bg-indigo-50/30 border-indigo-200 shadow-md ring-1 ring-indigo-100' : 'bg-white border-gray-200'}
                            `}>
                               <div className="flex justify-between items-start mb-3">
                                 <div>
                                   <h3 className={`font-bold text-lg ${isNext ? 'text-indigo-900' : 'text-gray-900'}`}>
                                     {stop.warehouse.city}
                                   </h3>
                                   <div className="flex items-center text-sm text-gray-500 mt-1">
                                      <MapPinIcon />
                                      <span className="ml-1">{stop.warehouse.latitude}, {stop.warehouse.longitude}</span>
                                   </div>
                                 </div>
                                 
                                 {isCompleted && (
                                   <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                     {new Date(stop.completed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                   </span>
                                 )}
                               </div>

                               {/* Packages Section */}
                               <div className="space-y-3">
                                 {/* Pickups */}
                                 {stop.pickups.length > 0 && (
                                   <div className="bg-amber-50 rounded-md p-3 border border-amber-100">
                                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                                        <span>⬆</span> Pickup ({stop.pickups.length})
                                      </p>
                                      <div className="space-y-1">
                                        {stop.pickups.map(pkg => (
                                          <div key={pkg.id} className="flex items-center gap-2 text-sm text-amber-900 bg-white/50 px-2 py-1 rounded">
                                            <PackageIcon />
                                            <span className="font-mono">{pkg.pickup_code || 'NO-CODE'}</span>
                                            <span className="text-xs opacity-75">({pkg.size})</span>
                                          </div>
                                        ))}
                                      </div>
                                   </div>
                                 )}

                                 {/* Dropoffs */}
                                 {stop.dropoffs.length > 0 && (
                                   <div className="bg-blue-50 rounded-md p-3 border border-blue-100">
                                      <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-2 flex items-center gap-2">
                                        <span>⬇</span> Dropoff ({stop.dropoffs.length})
                                      </p>
                                      <div className="space-y-1">
                                        {stop.dropoffs.map(pkg => (
                                          <div key={pkg.id} className="flex items-center gap-2 text-sm text-blue-900 bg-white/50 px-2 py-1 rounded">
                                            <PackageIcon />
                                            <span className="font-mono">PKG-{pkg.id.slice(0,6)}</span>
                                            <span className="text-xs opacity-75">({pkg.size})</span>
                                          </div>
                                        ))}
                                      </div>
                                   </div>
                                 )}

                                 {/* Helper if nothing to do (Hub Stop usually) */}
                                 {stop.pickups.length === 0 && stop.dropoffs.length === 0 && (
                                    <p className="text-sm text-gray-400 italic">No package exchange scheduled.</p>
                                 )}
                               </div>

                               {/* Action Button for THIS stop */}
                               {isNext && route.status === 'in_progress' && (
                                 <div className="mt-4 pt-4 border-t border-indigo-100">
                                   <button
                                     onClick={() => handleCompleteStop(stop.id)}
                                     disabled={actionLoading}
                                     className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm active:scale-95 flex items-center justify-center gap-2"
                                   >
                                     {actionLoading ? (
                                       <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
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