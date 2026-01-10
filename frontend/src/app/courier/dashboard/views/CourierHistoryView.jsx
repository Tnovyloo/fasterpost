"use client";

import { useState, useEffect } from "react";
import api from "@/axios/api";
import { ArrowLeft, Map, Calendar, CheckCircle, XCircle } from "lucide-react";

export default function CourierHistoryView({ role, darkMode }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get("/api/courier/routes/");
        setHistory(res.data.results || res.data);
      } catch (err) {
        console.error("Failed to load history", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading) return <div className="text-center py-10 opacity-50">Loading history...</div>;

  // --- DETAIL VIEW ---
  if (selectedRoute) {
      return (
          <div className="space-y-6">
              <button 
                onClick={() => setSelectedRoute(null)}
                className="flex items-center gap-2 font-bold hover:opacity-70 transition"
              >
                  <ArrowLeft className="w-5 h-5" /> Back to List
              </button>
              
              <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className={`p-6 border-b flex justify-between items-center ${darkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
                      <div>
                          <h2 className="text-xl font-bold">Route Details</h2>
                          <p className="text-sm opacity-60">{selectedRoute.scheduled_date}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          selectedRoute.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                          {selectedRoute.status}
                      </span>
                  </div>
                  <div className="p-6">
                      <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                              <p className="text-xs opacity-60 uppercase">Distance</p>
                              <p className="font-bold">{selectedRoute.total_distance} km</p>
                          </div>
                          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                              <p className="text-xs opacity-60 uppercase">Stops</p>
                              <p className="font-bold">{selectedRoute.stops.length}</p>
                          </div>
                      </div>
                      
                      <h3 className="font-bold mb-4">Itinerary</h3>
                      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px before:h-full before:w-0.5 before:bg-gray-200 dark:before:bg-gray-700 before:z-0">
                          {selectedRoute.stops.map((stop, i) => (
                              <div key={stop.id} className="relative flex items-start gap-4 z-10">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                                      {i + 1}
                                  </div>
                                  <div className={`pb-4 ${i < selectedRoute.stops.length-1 ? 'border-b border-gray-100 dark:border-gray-700 w-full' : ''}`}>
                                      <p className="font-bold">
                                          {stop.postmat ? `Postmat: ${stop.postmat.name}` : `Warehouse: ${stop.warehouse?.city}`}
                                      </p>
                                      <p className="text-sm opacity-60">{stop.postmat?.address || stop.warehouse?.address}</p>
                                      {stop.completed_at && (
                                          <p className="text-xs text-green-500 mt-1 font-medium">
                                              Completed: {new Date(stop.completed_at).toLocaleTimeString()}
                                          </p>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )
  }

  // --- LIST VIEW ---
  return (
    <div className="space-y-6">
        <div className={`rounded-xl shadow-sm border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h1 className="text-2xl font-bold">Route History</h1>
            <p className="opacity-60 mt-1 text-sm">Past manifests and deliveries.</p>
        </div>

        <div className={`rounded-xl shadow-sm border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            {history.length === 0 ? (
                <div className="p-12 text-center opacity-50">No history available.</div>
            ) : (
                <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                    {history.map(route => (
                        <div 
                            key={route.id}
                            onClick={() => setSelectedRoute(route)}
                            className={`p-4 cursor-pointer transition flex items-center justify-between group ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${
                                    route.status === 'completed' ? 'bg-green-50 text-green-600' : (darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-400')
                                }`}>
                                    {route.status === 'completed' ? <CheckCircle className="w-6 h-6" /> : <Map className="w-6 h-6" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold">{route.scheduled_date}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded border uppercase ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                            {route.route_type === 'last_mile' ? 'Local' : 'Line Haul'}
                                        </span>
                                    </div>
                                    <p className="text-sm opacity-60 mt-0.5">
                                        {route.stops.length} stops • {route.total_distance} km
                                    </p>
                                </div>
                            </div>
                            <div className="opacity-40 group-hover:text-indigo-500 group-hover:opacity-100">
                                →
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}