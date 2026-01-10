"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/axios/api";
import { MapPin, Truck, CheckCircle, ArrowDown, ArrowUp, RefreshCw, Navigation, Box, ChevronRight } from "lucide-react";
import LockerInteractionModal from "./LockerInteractionModal";

export default function LocalCourierView({ darkMode, muted }) {
  const API_ROUTES = "/api/courier/routes";
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Stan dla modala
  const [activeStop, setActiveStop] = useState(null);

  const fetchCurrentRoute = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API_ROUTES}/current/`);
      setRoute(res.data);
    } catch (err) {
      if (err.response?.status === 404) setRoute(null);
      // cicha porażka lub logowanie
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentRoute();
  }, [fetchCurrentRoute]);

  const handleAction = async (url, msg) => {
    if(msg && !confirm(msg)) return;
    setActionLoading(true);
    try {
      await api.post(url);
      await fetchCurrentRoute();
    } catch(e) {
      alert("Error: " + (e.response?.data?.error || e.message));
    } finally {
      setActionLoading(false);
    }
  };

  const openLockerInterface = (stop) => {
      setActiveStop(stop);
  };

  const handleStopComplete = async (stopId) => {
      try {
          await api.post(`${API_ROUTES}/${route.id}/complete-stop/${stopId}/`);
          await fetchCurrentRoute(); // Odświeżamy całość po zakończeniu stopa
          setActiveStop(null);
      } catch (err) {
          alert("Error completing stop: " + (err.response?.data?.error || err.message));
      }
  };

  // --- NOWA LOGIKA: Lokalna aktualizacja stanu po skanie ---
  const updateLocalPackageStatus = (stopId, packageId, newStatus) => {
    setRoute(prevRoute => {
        if (!prevRoute) return null;

        // Tworzymy nową tablicę przystanków (immutable update)
        const newStops = prevRoute.stops.map(stop => {
            if (stop.id !== stopId) return stop;

            // Helper do aktualizacji paczki w liście
            const updatePackageList = (list) => list.map(pkg => {
                // Sprawdzamy ID (obsługa płaskiej struktury lub zagnieżdżonej 'package')
                const pId = pkg.id || pkg.package?.id;
                if (pId === packageId) {
                     // Aktualizujemy status w odpowiednim miejscu
                     if (pkg.package) {
                         return { ...pkg, package: { ...pkg.package, status: newStatus } };
                     }
                     return { ...pkg, status: newStatus };
                }
                return pkg;
            });

            return {
                ...stop,
                dropoffs: updatePackageList(stop.dropoffs),
                pickups: updatePackageList(stop.pickups)
            };
        });

        return { ...prevRoute, stops: newStops };
    });
  };

  // Helper: Znajdź aktualny obiekt stopu z głównego stanu route
  // (activeStop może być nieświeży, więc używamy jego ID żeby znaleźć świeżą wersję w route.stops)
  const currentActiveStop = route?.stops?.find(s => s.id === activeStop?.id) || activeStop;


  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] opacity-50 animate-pulse">
        <Truck className="w-12 h-12 mb-4 text-gray-400" />
        <p className="text-lg font-medium">Loading route data...</p>
    </div>
  );

  if (!route) return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <MapPin className="w-16 h-16 mb-4 opacity-30" />
        <h2 className="text-2xl font-bold mb-2">No Active Route</h2>
        <p>You don't have any assigned routes currently.</p>
    </div>
  );

  const nextStop = route.stops.find(s => !s.completed_at);
  const totalStops = route.stops.length;
  const completedStops = route.stops.filter(s => s.completed_at).length;
  const progress = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

  return (
    <div className={`space-y-6 pb-20 max-w-5xl mx-auto animate-fade-in ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
      
      {/* Header Card */}
      <div className={`rounded-3xl shadow-xl overflow-hidden relative border ${darkMode ? 'bg-gray-800/50 border-gray-700 backdrop-blur-lg' : 'bg-white border-gray-100'}`}>
           <div className={`absolute top-0 left-0 w-full h-2 ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
               <div className="h-full bg-blue-600 rounded-r-full transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
           </div>
           <div className="p-6 md:p-8 pt-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <div>
                   <div className="flex items-center gap-3 mb-1">
                       <Truck className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                       <h1 className="text-3xl font-black tracking-tight">Route #{route.id.slice(0,6).toUpperCase()}</h1>
                   </div>
                   <p className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                       <span>{route.scheduled_date}</span> • <span>{totalStops} stops</span> • <span>~{route.total_distance} km</span>
                   </p>
               </div>
               
               <div className="flex items-center gap-4 w-full md:w-auto">
                   {route.status === 'planned' && (
                       <button onClick={() => handleAction(`${API_ROUTES}/${route.id}/start/`, "Start route timing?")} disabled={actionLoading} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition transform active:scale-95 flex items-center justify-center gap-2">
                          {actionLoading && <RefreshCw className="w-5 h-5 animate-spin" />} START SHIFT
                       </button>
                   )}
                   {route.status === 'in_progress' && (
                        completedStops === totalStops ? (
                           <button onClick={() => handleAction(`${API_ROUTES}/${route.id}/finish/`, "Finish shift and submit report?")} disabled={actionLoading} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-green-600/20 transition transform active:scale-95 flex items-center justify-center gap-2">
                               {actionLoading && <RefreshCw className="w-5 h-5 animate-spin" />} FINISH SHIFT
                           </button>
                       ) : (
                           <div className={`px-6 py-3 rounded-xl font-bold border flex items-center gap-2 ${darkMode ? 'bg-blue-900/20 text-blue-400 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                               <RefreshCw className="w-5 h-5 animate-spin" /> IN PROGRESS
                           </div>
                       )
                   )}
                    {route.status === 'completed' && (
                       <div className={`px-6 py-3 rounded-xl font-bold border flex items-center gap-2 ${darkMode ? 'bg-green-900/20 text-green-400 border-green-800' : 'bg-green-50 text-green-700 border-green-100'}`}>
                           <CheckCircle className="w-5 h-5" /> COMPLETED
                       </div>
                   )}
               </div>
           </div>
      </div>

      {/* Stops List */}
      <div className="space-y-5">
        {route.stops.map((stop, i) => {
            const isCompleted = !!stop.completed_at;
            const isNext = stop.id === nextStop?.id;
            const hasCargo = stop.dropoffs.length > 0 || stop.pickups.length > 0;
            
            return (
                <div key={stop.id} 
                     className={`rounded-3xl border p-6 md:p-8 transition-all relative overflow-hidden group
                        ${isCompleted ? (darkMode ? 'bg-gray-800/50 border-gray-700 opacity-60' : 'bg-gray-50 border-gray-200 opacity-75') : 
                          isNext ? (darkMode ? 'bg-blue-900/10 border-blue-500/50 ring-2 ring-blue-500/20 shadow-lg shadow-blue-900/10' : 'bg-white border-blue-500 ring-4 ring-blue-50 shadow-xl') : 
                          (darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-md')
                        }`}
                >
                    {/* Next Stop Indicator/Background */}
                    {isNext && <div className={`absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full blur-3xl opacity-20 pointer-events-none ${darkMode ? 'bg-blue-400' : 'bg-blue-600'}`}></div>}

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div className="flex gap-5 items-start">
                            {/* Stop Number / Icon */}
                             <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 shadow-sm mt-1
                                 ${isCompleted ? (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500') : 
                                   isNext ? 'bg-blue-600 text-white shadow-blue-600/30' : 
                                   (darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')
                                 }`}>
                                 {isCompleted ? <CheckCircle className="w-8 h-8" /> : i + 1}
                             </div>
                             
                             {/* Address Info */}
                             <div>
                                 <div className="flex items-center gap-3 mb-2">
                                    <h3 className={`text-2xl font-bold leading-tight ${isCompleted ? 'line-through opacity-50' : ''}`}>
                                        {stop.postmat?.name || stop.warehouse?.city || "Unknown Stop"}
                                    </h3>
                                    {isNext && <span className="text-xs bg-blue-600 text-white px-3 py-1 rounded-full font-extrabold tracking-wider animate-pulse">NEXT STOP</span>}
                                 </div>
                                 <div className={`flex items-center gap-2 font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                     <MapPin className="w-5 h-5 shrink-0" />
                                     <p className="line-clamp-2">{stop.postmat?.address || stop.warehouse?.address || "No address data"}</p>
                                 </div>
                             </div>
                        </div>

                        {/* Action Section */}
                        <div className="flex flex-col items-end gap-4 w-full md:w-auto">
                             {/* Cargo Stats */}
                             {hasCargo && (
                                 <div className="flex gap-3">
                                     {stop.dropoffs.length > 0 && (
                                         <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                                             <ArrowDown className="w-4 h-4" /> {stop.dropoffs.length} DROP
                                         </div>
                                     )}
                                     {stop.pickups.length > 0 && (
                                         <div className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm ${darkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                                             <ArrowUp className="w-4 h-4" /> {stop.pickups.length} PICK
                                         </div>
                                     )}
                                 </div>
                             )}

                             {/* Main Action Button */}
                             {isNext && route.status === 'in_progress' ? (
                                 <button 
                                     onClick={() => openLockerInterface(stop)}
                                     className={`w-full md:w-auto py-4 px-8 rounded-2xl font-black tracking-wide flex items-center justify-center gap-3 shadow-lg transition transform active:scale-95 text-lg
                                        ${darkMode ? 'bg-white text-gray-900 hover:bg-gray-200 shadow-white/10' : 'bg-gray-900 text-white hover:bg-gray-800 shadow-gray-900/20'}
                                     `}
                                 >
                                     <Box className="w-6 h-6" /> OPEN LOCKER INTERFACE
                                 </button>
                             ) : (
                                 !isCompleted && route.status === 'in_progress' && (
                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`} target="_blank" rel="noreferrer" 
                                       className={`w-full md:w-auto py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 border transition
                                          ${darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}
                                       `}>
                                        <Navigation className="w-5 h-5" /> Navigate
                                    </a>
                                 )
                             )}
                        </div>
                    </div>
                </div>
            );
        })}
      </div>

      {/* Modal Component */}
      {currentActiveStop && (
          <LockerInteractionModal 
            stop={currentActiveStop} 
            routeId={route.id}
            onClose={() => setActiveStop(null)} 
            onComplete={handleStopComplete}
            // Przekazujemy funkcję aktualizującą stan rodzica
            onScanSuccess={updateLocalPackageStatus}
          />
      )}
      
      <div className={`text-center text-sm font-medium pt-6 pb-10 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Swipe down to refresh route data manually.
      </div>
    </div>
  );
}