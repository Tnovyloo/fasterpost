"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/app/components/Header";
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
const WarehouseIcon = () => (
  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
);
const PostmatIcon = () => (
  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m-8-8h16" /></svg>
);
const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const ArrowLeftIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
);

// --- Helper: Collapsible Package List ---
const PackageDropdown = ({ type, packages, stopType }) => {
  if (!packages || packages.length === 0) return null;

  const isPickup = type === 'pickup';
  const theme = isPickup 
    ? { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', hover: 'hover:bg-amber-100', iconBg: 'bg-amber-100 text-amber-700' }
    : { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-900', hover: 'hover:bg-blue-100', iconBg: 'bg-blue-100 text-blue-700' };

  let actionLabel = "";
  if (stopType === 'POSTMAT') {
      actionLabel = isPickup ? "Collect Returns" : "Deposit to Locker";
  } else {
      actionLabel = isPickup ? "Load Truck" : "Unload Truck";
  }

  return (
    <details className={`rounded-lg border ${theme.border} ${theme.bg} overflow-hidden group mb-2`}>
      <summary className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none transition-colors ${theme.hover}`}>
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${theme.text}`}>
          <span className="text-lg">{isPickup ? '⬆' : '⬇'}</span>
          <span>{actionLabel}</span>
          <span className="bg-white/60 px-2 py-0.5 rounded-full ml-1 border border-black/5 min-w-[24px] text-center">{packages.length}</span>
        </div>
        <svg className={`w-4 h-4 ${theme.text} transform transition-transform duration-200 group-open:rotate-180`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      
      <div className="px-4 pb-4 pt-1 space-y-2">
        {packages.map(pkg => (
          <div key={pkg.id} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200 shadow-sm text-sm">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${theme.iconBg}`}>
                <PackageIcon />
              </div>
              <div className="flex flex-col">
                <span className="font-mono font-bold text-gray-800">
                   {pkg.pickup_code ? pkg.pickup_code : `PKG-${pkg.id.slice(0,6).toUpperCase()}`}
                </span>
                <span className="text-xs text-gray-500 font-medium capitalize">{pkg.size} Size</span>
              </div>
            </div>
            {pkg.weight && <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded border border-gray-200">{pkg.weight}kg</span>}
          </div>
        ))}
      </div>
    </details>
  );
};

export default function CourierDashboard() {
  const API_ROUTES = "/api/courier/routes";

  const [activeTab, setActiveTab] = useState("current"); // 'current' or 'history'
  const [route, setRoute] = useState(null); // The route to display (current or selected from history)
  const [historyRoutes, setHistoryRoutes] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  const getAuthConfig = () => {
    const token = getToken();
    return token ? { headers: { Authorization: `Token ${token}` } } : {};
  };

  // --- Data Fetching ---

  const fetchCurrentRoute = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API_ROUTES}/current/`, getAuthConfig());
      setRoute(res.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setRoute(null);
      } else {
        const backendMsg = err.response?.data?.detail || err.response?.data?.error;
        const msg = backendMsg ? JSON.stringify(backendMsg) : err.message;
        setError(`Failed to load route: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API_ROUTES}/`, getAuthConfig());
      setHistoryRoutes(res.data.results || res.data); // Handle potential pagination
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'current') {
      fetchCurrentRoute();
    } else {
      fetchHistory();
    }
  }, [activeTab, fetchCurrentRoute, fetchHistory]);

  // --- Actions ---

  const handleStartRoute = async () => {
    if (!confirm("Are you ready to start your shift?")) return;
    setActionLoading(true);
    try {
      await api.post(`${API_ROUTES}/${route.id}/start/`, {}, getAuthConfig());
      
      // UX FIX: Force switch to 'current' tab to show active state
      setActiveTab('current'); 
      // Refresh to get updated status
      await fetchCurrentRoute();
      
    } catch (err) {
      alert("Error starting route: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteStop = async (stopId) => {
    if (!confirm("Confirm you have finished all tasks at this location?")) return;
    setActionLoading(true);
    try {
      await api.post(`${API_ROUTES}/${route.id}/complete-stop/${stopId}/`, {}, getAuthConfig());
      await fetchCurrentRoute();
    } catch (err) {
      alert("Error completing stop: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinishRoute = async () => {
    if (!confirm("Finish route and end day?")) return;
    setActionLoading(true);
    try {
      await api.post(`${API_ROUTES}/${route.id}/finish/`, {}, getAuthConfig());
      
      // UX FIX: Force switch to 'current' tab to automatically load the NEXT route (if any)
      setActiveTab('current');
      // Explicitly fetch incase we were already on 'current' and useEffect doesn't trigger
      await fetchCurrentRoute();
      
    } catch (err) {
      alert("Error finishing route: " + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // --- View Helpers ---

  const getStopInfo = (stop) => {
    if (stop.postmat) {
      return {
        type: 'POSTMAT',
        title: `Paczkomat ${stop.postmat.name}`,
        subtitle: stop.postmat.address,
        lat: stop.postmat.latitude,
        lon: stop.postmat.longitude,
        icon: <PostmatIcon />
      };
    } else if (stop.warehouse) {
      return {
        type: 'WAREHOUSE',
        title: `Magazyn ${stop.warehouse.city}`,
        subtitle: stop.warehouse.address || `${stop.warehouse.city} Hub`,
        lat: stop.warehouse.latitude,
        lon: stop.warehouse.longitude,
        icon: <WarehouseIcon />
      };
    }
    return { 
        type: 'UNKNOWN', 
        title: 'Unknown Location', 
        subtitle: '', 
        icon: <MapPinIcon />, 
        lat: 0, 
        lon: 0 
    };
  };

  // --- Sub-Components for this page ---

  const RouteTimeline = ({ routeData }) => {
    if (!routeData) return null;

    const totalStops = routeData.stops?.length || 0;
    const completedStops = routeData.stops?.filter(s => s.completed_at).length || 0;
    const progressPercent = totalStops === 0 ? 0 : (completedStops / totalStops) * 100;
    const nextStopIndex = routeData.stops?.findIndex(s => !s.completed_at);
    const nextStop = routeData.stops?.[nextStopIndex];
    const nextStopInfo = nextStop ? getStopInfo(nextStop) : null;
    const isHistoryView = activeTab === 'history'; // Read-only mode

    return (
      <div className="space-y-6">
        {/* STATS & ACTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
            <div className="flex justify-between items-end mb-3">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wide">Route Progress</span>
              <span className="text-2xl font-bold text-indigo-600">{completedStops}/{totalStops}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3 mb-4 overflow-hidden">
              <div className="bg-indigo-600 h-3 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <div className="flex justify-between text-sm font-medium text-gray-600 pt-2 border-t border-gray-100">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 uppercase">Total Distance</span>
                  <span className="text-gray-900">{routeData.total_distance} km</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-xs text-gray-400 uppercase">Est. Time</span>
                  <span className="text-gray-900">{Math.floor(routeData.estimated_duration / 60)}h {routeData.estimated_duration % 60}m</span>
                </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow border border-gray-200 p-6 flex flex-col items-center justify-center">
              {routeData.status === 'planned' && !isHistoryView && (
                <button onClick={handleStartRoute} disabled={actionLoading} className="w-full h-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition transform active:scale-95 disabled:opacity-50 disabled:scale-100 text-lg tracking-wide">
                  {actionLoading ? "Starting..." : "START ROUTE"}
                </button>
              )}
              
              {routeData.status === 'in_progress' && completedStops < totalStops && nextStopInfo && !isHistoryView && (
                <div className="text-center w-full">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Next Destination</p>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 flex items-center justify-center gap-3">
                    <span className="text-indigo-500">{nextStopInfo.type === 'POSTMAT' ? <PostmatIcon /> : <WarehouseIcon />}</span>
                    <h3 className="text-lg font-bold text-indigo-900 truncate">{nextStopInfo.title}</h3>
                  </div>
                </div>
              )}

              {routeData.status === 'in_progress' && completedStops === totalStops && !isHistoryView && (
                <button onClick={handleFinishRoute} disabled={actionLoading} className="w-full h-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition transform active:scale-95 disabled:opacity-50 disabled:scale-100 text-lg tracking-wide">
                  {actionLoading ? "Finishing..." : "FINISH DAY"}
                </button>
              )}

              {(routeData.status === 'completed' || isHistoryView) && (
                <div className="text-center text-gray-500 flex flex-col items-center">
                  <div className={`p-3 rounded-full mb-2 ${routeData.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-gray-100'}`}>
                    {routeData.status === 'completed' ? <CheckIcon /> : <span className="font-bold text-xs">{routeData.status}</span>}
                  </div>
                  <span className="font-bold text-lg">{routeData.status === 'completed' ? 'Route Completed' : 'Route History View'}</span>
                  {/* Provide way to start if viewing a planned route in history context but it IS valid to start */}
                  {isHistoryView && routeData.status === 'planned' && (
                     <button onClick={() => { setRoute(routeData); handleStartRoute(); }} className="mt-2 text-sm text-indigo-600 font-bold hover:underline">
                        Start This Route
                     </button>
                  )}
                </div>
              )}
          </div>
        </div>

        {/* TIMELINE */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">Itinerary</h2>
            </div>
            <div className="p-6">
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gray-200 before:z-0">
                {routeData.stops.map((stop, index) => {
                    const isCompleted = !!stop.completed_at;
                    const isNext = !isCompleted && index === nextStopIndex && !isHistoryView;
                    const isPending = !isCompleted && !isNext;
                    const info = getStopInfo(stop);

                    return (
                      <div key={stop.id} className={`relative flex items-start gap-4 ${isPending ? 'opacity-50 grayscale' : ''}`}>
                        <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0 border-4 transition-all duration-300 ${isCompleted ? 'bg-green-100 border-green-500 text-green-700' : ''} ${isNext ? 'bg-white border-indigo-600 text-indigo-700 shadow-lg scale-110' : ''} ${isPending ? 'bg-white border-gray-300 text-gray-400' : ''}`}>
                            {isCompleted ? <CheckIcon /> : <span className="text-sm font-bold">{index + 1}</span>}
                        </div>
                        <div className={`flex-1 rounded-xl border p-5 transition-all duration-300 ${isNext ? 'bg-indigo-50/40 border-indigo-200 shadow-md ring-1 ring-indigo-100' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-gray-400">{info.type === 'POSTMAT' ? <PostmatIcon /> : <WarehouseIcon />}</span>
                                    <h3 className={`font-bold text-lg ${isNext ? 'text-indigo-900' : 'text-gray-900'}`}>{info.title}</h3>
                                </div>
                                <div className="flex items-center text-sm text-gray-600 font-medium">
                                    <MapPinIcon />
                                    <span className="ml-1 truncate max-w-[250px]" title={info.subtitle}>{info.subtitle || `${info.lat.toFixed(4)}, ${info.lon.toFixed(4)}`}</span>
                                </div>
                              </div>
                              {isCompleted && (
                                <span className="text-xs font-bold bg-green-100 text-green-800 px-3 py-1 rounded-full border border-green-200 whitespace-nowrap self-start">
                                  Done at {new Date(stop.completed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              <PackageDropdown type="pickup" packages={stop.pickups} stopType={info.type} />
                              <PackageDropdown type="dropoff" packages={stop.dropoffs} stopType={info.type} />
                              {stop.pickups.length === 0 && stop.dropoffs.length === 0 && (
                                <div className="text-center py-2 border-t border-gray-100 mt-2">
                                  <p className="text-xs text-gray-400 font-medium italic">Stop & Go - No packages here.</p>
                                </div>
                              )}
                            </div>

                            {isNext && (
                              <div className="mt-4 pt-4 border-t border-indigo-100">
                                <button onClick={() => handleCompleteStop(stop.id)} disabled={actionLoading} className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-md active:scale-95 flex items-center justify-center gap-2">
                                  {actionLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <CheckIcon />}
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
      </div>
    );
  };

  const HistoryList = () => (
    <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <HistoryIcon />
        <h2 className="text-lg font-bold text-gray-800">Route History</h2>
      </div>
      {historyRoutes.length === 0 ? (
        <div className="p-12 text-center text-gray-500">No past routes found.</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {historyRoutes.map(r => (
            <div 
              key={r.id} 
              onClick={() => { setRoute(r); setActiveTab('detail_view'); window.scrollTo({top:0, behavior:'smooth'}); }}
              className="p-4 hover:bg-indigo-50/50 cursor-pointer transition flex items-center justify-between group"
            >
              <div>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">{r.scheduled_date}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        r.status === 'completed' ? 'bg-green-100 text-green-700' : 
                        r.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>{r.status.toUpperCase()}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1 flex gap-4">
                   <span>{r.route_type === 'last_mile' ? 'Local Delivery' : 'Line Haul'}</span>
                   <span>• {r.stops.length} Stops</span>
                   <span>• {r.total_distance} km</span>
                </div>
              </div>
              <div className="text-gray-400 group-hover:text-indigo-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <Header />
      
      <div className="max-w-3xl mx-auto space-y-6 mt-16 md:mt-20">
        
        {/* TOP BAR / TABS */}
        <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Driver Portal</h1>
            
            <div className="bg-white p-1 rounded-lg shadow-sm border border-gray-200 flex">
                <button 
                    onClick={() => setActiveTab('current')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'current' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Current Task
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    History
                </button>
            </div>
        </div>

        {/* BACK BUTTON for History Detail View */}
        {activeTab === 'detail_view' && (
             <button onClick={() => setActiveTab('history')} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 mb-2 transition">
                <ArrowLeftIcon /> Back to List
             </button>
        )}

        {/* CONTENT RENDERER */}
        {loading ? (
            <div className="py-20 text-center flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-indigo-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Syncing data...</p>
            </div>
        ) : (
            <>
                {error && activeTab === 'current' && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm font-medium">
                        {error}
                    </div>
                )}

                {activeTab === 'current' && !route && !error && (
                    <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
                        <TruckIcon />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900">No active route</h3>
                        <p className="text-gray-500 mt-2 font-medium">You have no tasks assigned right now.</p>
                    </div>
                )}

                {activeTab === 'current' && route && <RouteTimeline routeData={route} />}
                {activeTab === 'history' && <HistoryList />}
                {activeTab === 'detail_view' && <RouteTimeline routeData={route} />}
            </>
        )}
      </div>
    </div>
  );
}