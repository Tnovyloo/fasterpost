"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import Header from "@/app/components/Header";
import api from "@/axios/api";

const RouteNetworkMap = dynamic(() => import("@/app/components/RouteNetworkMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">
      Loading Network Map...
    </div>
  ),
});

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, planned: 0, completed: 0, total_km: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHubId, setSelectedHubId] = useState(null); 
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [routesRes, warehousesRes] = await Promise.all([
        api.get("/api/admin/routes/?page_size=2000"), 
        api.get("/api/admin/warehouses/?page_size=1000")
      ]);
      
      const routeData = routesRes.data.results || routesRes.data || [];
      setRoutes(routeData);
      setWarehouses(warehousesRes.data.results || warehousesRes.data || []);

      const newStats = routeData.reduce((acc, r) => {
        if (r.status === 'in_progress') acc.active += 1;
        if (r.status === 'planned') acc.planned += 1;
        if (r.status === 'completed') acc.completed += 1;
        acc.total_km += r.total_distance;
        return acc;
      }, { active: 0, planned: 0, completed: 0, total_km: 0 });
      setStats(newStats);

    } catch (err) {
      console.error("Failed to load route data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleHubSelect = (id) => {
    setSelectedHubId(id);
    setSearchTerm("");
  };

  const filteredRoutes = useMemo(() => {
    let result = routes;

    if (selectedHubId) {
        result = result.filter(r => {
            if (r.route_type !== 'last_mile') return false;
            const firstStop = r.stops?.[0];
            return firstStop?.warehouse?.id === selectedHubId;
        });
    }

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(r => 
            (r.courier_name && r.courier_name.toLowerCase().includes(term)) || 
            (r.courier_email && r.courier_email.toLowerCase().includes(term)) ||
            (r.id && r.id.toLowerCase().includes(term))
        );
    }
    return result;
  }, [routes, searchTerm, selectedHubId]);

  const handleGenerateGlobal = async () => {
    if(!confirm("Generate National Line Haul routes? This analyzes all pending warehouse-to-warehouse packages.")) return;
    setIsGenerating(true);
    try {
        const res = await api.post("/api/admin/routes/generate/", { date: new Date().toISOString().split('T')[0] });
        alert(`Success! Created ${res.data.routes_created} line haul routes.`);
        fetchData();
    } catch(err) {
        alert("Generation failed: " + (err.response?.data?.error || err.message));
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerateAllLocal = async () => {
    if(!confirm("Generate Local Routes for ALL warehouses? This might take a moment.")) return;
    setIsGenerating(true);
    try {
        const res = await api.post("/api/admin/local-routes/generate-all/");
        alert(`Success! Created ${res.data.total_routes_created} local routes across Poland.`);
        fetchData();
    } catch(err) {
        alert("Bulk generation failed: " + (err.response?.data?.error || err.message));
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerateLocal = async (warehouseId) => {
    if(!confirm("Generate Local Last-Mile routes for this hub?")) return;
    try {
        const res = await api.post("/api/admin/local-routes/generate/", { 
            warehouse_id: warehouseId,
            date: new Date().toISOString().split('T')[0] 
        });
        
        if (res.data.routes_created > 0) {
            alert(`Success! Created ${res.data.routes_created} local routes.`);
            fetchData();
            setSelectedHubId(warehouseId);
        } else {
            alert("No routes created. Check if you have pending local packages and available couriers.");
        }
    } catch(err) {
        alert("Local generation failed: " + (err.response?.data?.error || err.message));
    }
  };

  // NEW: Handle Clearing Hub Routes
  const handleClearHubRoutes = async (warehouseId) => {
    if(!confirm("Clear ALL PLANNED local routes for this hub?")) return;
    try {
        await api.post("/api/admin/local-routes/clear-hub/", { warehouse_id: warehouseId });
        alert("Hub routes cleared.");
        fetchData();
    } catch(err) {
        alert("Clear failed: " + (err.response?.data?.error || err.message));
    }
  };

  const handleClearRoutes = async () => {
    if(!confirm("⚠️ Clear ALL PLANNED routes in the system? (Active/Completed routes are safe)")) return;
    try {
        await api.delete("/api/admin/routes/clear/");
        fetchData();
    } catch(err) {
        alert("Failed to clear routes");
    }
  }

  const selectedHubName = selectedHubId ? warehouses.find(w => w.id === selectedHubId)?.city : null;

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <Header />
      <div className="max-w-[1600px] mx-auto p-6 space-y-6 mt-16">
        
        {/* TOP BAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Logistics Control Tower</h1>
                <p className="text-gray-500 mt-1">Monitor line haul and last mile operations</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                    <input 
                        type="text" 
                        placeholder="Search courier..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                        onClick={handleClearRoutes}
                        className="px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition text-sm font-bold whitespace-nowrap flex-1 sm:flex-none"
                    >
                        Reset Plans
                    </button>
                    {/* NEW: Global Local Gen */}
                    <button 
                        onClick={handleGenerateAllLocal}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-bold shadow-md flex items-center gap-2 disabled:opacity-50 whitespace-nowrap flex-1 sm:flex-none"
                    >
                        {isGenerating ? "..." : "⚡ All Local"}
                    </button>
                    <button 
                        onClick={handleGenerateGlobal}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold shadow-md flex items-center gap-2 disabled:opacity-50 whitespace-nowrap flex-1 sm:flex-none"
                    >
                        {isGenerating ? "..." : "⚡ Global Line"}
                    </button>
                </div>
            </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard label="Active Routes" value={stats.active} color="blue" />
            <StatCard label="Planned" value={stats.planned} color="yellow" />
            <StatCard label="Completed" value={stats.completed} color="green" />
            <StatCard label="Total Distance" value={`${Math.round(stats.total_km).toLocaleString()} km`} color="gray" />
        </div>

        {/* MAIN VISUALIZATION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px]">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2">
                        Live Network Map 
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-normal">
                            {filteredRoutes.length} Routes Visible
                        </span>
                    </h2>
                    <div className="flex gap-4 text-xs font-medium">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-indigo-500"></span> Line Haul</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-pink-500"></span> Last Mile</span>
                    </div>
                </div>
                <div className="flex-1 relative z-0">
                    <RouteNetworkMap 
                        routes={filteredRoutes} 
                        warehouses={warehouses}
                        onGenerateLocal={handleGenerateLocal} 
                        onClearHub={handleClearHubRoutes} // Pass new handler
                        onSelectHub={handleHubSelect}
                        selectedHubId={selectedHubId}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-700">
                        {selectedHubId ? `Local Routes: ${selectedHubName}` : "All Manifests"}
                    </h2>
                    {selectedHubId && (
                        <button 
                            onClick={() => setSelectedHubId(null)}
                            className="text-xs text-red-600 font-bold hover:underline"
                        >
                            Clear Filter ✕
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {filteredRoutes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <p>No routes found</p>
                        </div>
                    ) : (
                        filteredRoutes.map(route => (
                            <RouteListItem key={route.id} route={route} />
                        ))
                    )}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}

// ... StatCard and RouteListItem remain same ...
function StatCard({ label, value, color }) {
    const colors = {
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
        green: "bg-green-50 text-green-700 border-green-100",
        gray: "bg-gray-50 text-gray-700 border-gray-100",
    };
    return (
        <div className={`p-4 rounded-xl border ${colors[color]}`}>
            <p className="text-xs font-bold uppercase opacity-80">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
    );
}

function RouteListItem({ route }) {
    const isLineHaul = route.route_type !== 'last_mile';
    const statusColors = {
        planned: 'bg-yellow-100 text-yellow-800',
        in_progress: 'bg-blue-100 text-blue-800',
        completed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800'
    };
    
    const stopCount = route.stops ? route.stops.length : 0;

    return (
        <div className="p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition cursor-pointer group">
            <div className="flex justify-between items-start mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${isLineHaul ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-pink-50 text-pink-700 border-pink-100'}`}>
                    {isLineHaul ? 'LINE HAUL' : 'LAST MILE'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${statusColors[route.status]}`}>
                    {route.status.toUpperCase()}
                </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 uppercase">
                    {route.courier_name ? route.courier_name.charAt(0) : '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{route.courier_name || "Unassigned"}</p>
                    <p className="text-xs text-gray-500 truncate">{stopCount} stops • {route.total_distance} km</p>
                </div>
            </div>
        </div>
    );
}