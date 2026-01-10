"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/axios/api";
import { Truck, MapPin, CheckCircle, Package, ArrowRight, Clock, RefreshCw } from "lucide-react";

export default function WarehouseCourierView({ darkMode, muted }) {
  const API_ROUTES = "/api/courier/routes";
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCurrentRoute = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`${API_ROUTES}/current/`);
      setRoute(res.data);
    } catch (err) {
      if (err.response?.status === 404) setRoute(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCurrentRoute(); }, [fetchCurrentRoute]);

  const handleAction = async (url, msg) => {
    if(!confirm(msg)) return;
    setActionLoading(true);
    try { await api.post(url); await fetchCurrentRoute(); }
    catch(e) { alert("Error: " + (e.response?.data?.error || e.message)); }
    finally { setActionLoading(false); }
  };

  if (loading) return <div className="text-center py-10 opacity-50">Loading manifest...</div>;

  if (!route) {
    return (
      <div className={`rounded-xl shadow-sm border p-8 text-center mt-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="w-20 h-20 bg-orange-50/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Truck className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-xl font-bold">No Active Manifest</h2>
        <p className="opacity-60 mt-2 text-sm">You are currently on standby. Check back later.</p>
        <button onClick={fetchCurrentRoute} className="mt-6 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 mx-auto">
            <RefreshCw className="w-4 h-4" /> Check Again
        </button>
      </div>
    );
  }

  const nextStop = route.stops.find(s => !s.completed_at);
  const isCompleted = route.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="bg-orange-600 px-5 py-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
                <Truck className="w-6 h-6" />
                <div>
                    <h1 className="text-lg font-bold uppercase tracking-wide">Line Haul</h1>
                    <p className="text-[10px] opacity-80 font-mono">{route.id.slice(0,8)}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-[10px] opacity-80 uppercase font-bold">Next Stop</p>
                <p className="font-bold text-base truncate max-w-[120px]">{nextStop ? nextStop.warehouse?.city : "DEPOT"}</p>
            </div>
        </div>
        
        <div className="p-5 flex flex-col gap-6">
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className="text-[10px] opacity-60 uppercase font-bold">Distance</p>
                    <p className="font-bold text-lg">{route.total_distance} km</p>
                </div>
                <div className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className="text-[10px] opacity-60 uppercase font-bold">Stops</p>
                    <p className="font-bold text-lg">{route.stops.length}</p>
                </div>
                <div className={`p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <p className="text-[10px] opacity-60 uppercase font-bold">Time</p>
                    <p className="font-bold text-lg">{Math.floor(route.estimated_duration/60)}h {route.estimated_duration%60}m</p>
                </div>
            </div>

            <div className="w-full">
                {route.status === 'planned' && (
                    <button 
                        onClick={() => handleAction(`${API_ROUTES}/${route.id}/start/`, "Start Route?")}
                        disabled={actionLoading}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-md transition active:scale-95"
                    >
                        START TRANSPORT
                    </button>
                )}
                {route.status === 'in_progress' && !nextStop && (
                    <button 
                        onClick={() => handleAction(`${API_ROUTES}/${route.id}/finish/`, "Complete Manifest?")}
                        disabled={actionLoading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition active:scale-95"
                    >
                        COMPLETE MANIFEST
                    </button>
                )}
            </div>
        </div>
      </div>

      {/* Stops List */}
      <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`p-4 border-b font-bold uppercase text-xs tracking-wide ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
            Route Plan
        </div>
        <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {route.stops.map((stop, i) => {
                const isDone = !!stop.completed_at;
                const isCurrent = stop.id === nextStop?.id;
                
                return (
                    <div key={stop.id} className={`p-5 flex flex-col gap-4 ${isDone ? 'opacity-50' : ''} ${isCurrent ? (darkMode ? 'bg-orange-900/10' : 'bg-orange-50/50') : ''}`}>
                        
                        <div className="flex items-start gap-4">
                            <div className={`w-8 h-8 md:mx-auto flex items-center justify-center rounded-full font-bold text-sm shrink-0 ${isDone ? 'bg-green-100 text-green-700' : (darkMode ? 'bg-gray-700' : 'bg-gray-200 text-gray-600')}`}>
                                {isDone ? <CheckCircle className="w-5 h-5" /> : i + 1}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <MapPin className={`w-4 h-4 ${isDone ? 'opacity-50' : ''}`} />
                                    <h4 className="text-lg font-bold truncate">{stop.warehouse?.city || "Unknown Hub"}</h4>
                                </div>
                                <p className="text-xs opacity-60 font-mono truncate">{stop.warehouse?.address}</p>
                                
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {stop.dropoffs.length > 0 && (
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${darkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                                            <ArrowRight className="w-3 h-3 rotate-90" /> UNLOAD: {stop.dropoffs.length}
                                        </span>
                                    )}
                                    {stop.pickups.length > 0 && (
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 ${darkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>
                                            <ArrowRight className="w-3 h-3 -rotate-90" /> LOAD: {stop.pickups.length}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isCurrent && route.status === 'in_progress' && (
                            <button 
                                onClick={() => handleAction(`${API_ROUTES}/${route.id}/complete-stop/${stop.id}/`, "Confirm stop completion?")}
                                disabled={actionLoading}
                                className="w-full py-3 bg-gray-900 dark:bg-black text-white font-bold rounded shadow transition text-sm active:scale-95"
                            >
                                CONFIRM STOP
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
      </div>
    </div>
  );
}