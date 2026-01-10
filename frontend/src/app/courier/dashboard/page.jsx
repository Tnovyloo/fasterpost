"use client";

import { useState, useEffect } from "react";
import { 
  Truck, Map, Clock, Menu, Sun, Moon, Volume2, VolumeX, CloudRain
} from "lucide-react";
import Header from "@/app/components/Header";
import api from "@/axios/api";

// Import Views
import LocalCourierView from "./views/LocalCourierView";
import WarehouseCourierView from "./views/WarehouseCourierView";
import CourierHistoryView from "./views/CourierHistoryView";

export default function CourierDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("current_route");
  const [role, setRole] = useState(null); 
  const [loading, setLoading] = useState(true);
  
  // User Preferences
  const [darkMode, setDarkMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [weather, setWeather] = useState("Loading...");

  useEffect(() => {
    if (window.innerWidth >= 1024) setSidebarOpen(true);

    const fetchRole = async () => {
      try {
        const res = await api.get("/accounts/user/role/");
        setRole(res.data.role); 
      } catch (err) {
        console.error("Failed to fetch role", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
    setTimeout(() => setWeather("12°C, Rainy"), 1500);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  const menuItems = [
    { id: "current_route", title: "Aktualna trasa", icon: <Map className="w-5 h-5" />, color: "bg-indigo-600" },
    { id: "history", title: "Historia tras", icon: <Clock className="w-5 h-5" />, color: "bg-orange-600" },
  ];

  const renderContent = () => {
    if (loading) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

    if (activeTab === "current_route") {
        const props = { darkMode, muted };
        if (role === 'warehouse') return <WarehouseCourierView {...props} />;
        return <LocalCourierView {...props} />;
    }
    
    if (activeTab === "history") {
        return <CourierHistoryView role={role} darkMode={darkMode} />;
    }

    return <div>Select a tab</div>;
  };

  // --- Layout Fix: Używamy h-screen i overflow-hidden ---
  return (
    <div className={`h-screen flex flex-col overflow-hidden ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      
      {/* 1. HEADER (Stała wysokość) */}
      <div className="shrink-0 z-40 relative">
          <Header />
      </div>

      {/* 2. Mobile Sub-Header (Pogoda/Menu) */}
      <div className={`lg:hidden flex-shrink-0 px-4 py-2 flex justify-between items-center shadow-sm z-30 ${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white border-b border-gray-200'}`}>
         <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <Menu className="w-6 h-6" />
         </button>
         <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1"><CloudRain className="w-4 h-4" /> {weather}</span>
         </div>
      </div>

      {/* 3. MAIN CONTAINER (Wypełnia resztę ekranu) */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* SIDEBAR */}
        <aside 
          className={`
            absolute lg:static inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:w-0 lg:hidden"} 
            ${darkMode ? 'bg-gray-800 border-r border-gray-700' : 'bg-white border-r border-gray-200 shadow-xl'}
            flex flex-col h-full
          `}
        >
          {/* Sidebar Header */}
          <div className={`p-4 border-b flex items-center justify-between shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3">
               <div className={`text-white p-2 rounded-lg shrink-0 ${role === 'warehouse_driver' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                  <Truck className="w-6 h-6" />
               </div>
               <div>
                 <h1 className="font-bold leading-tight">Kurier App</h1>
                 <p className="text-[10px] opacity-60 uppercase tracking-wider">
                   {role === 'warehouse_driver' ? 'Line Haul' : 'Last Mile'}
                 </p>
               </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">✕</button>
          </div>

          {/* Menu Items (Scrollable if needed) */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if(window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`w-full group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                  ${activeTab === item.id 
                    ? (darkMode ? "bg-gray-700 text-white" : "bg-gray-50 text-gray-900 shadow-sm ring-1 ring-gray-200")
                    : (darkMode ? "text-gray-400 hover:bg-gray-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
                  }
                `}
              >
                <div className={`
                  ${activeTab === item.id ? item.color : (darkMode ? "bg-gray-700" : "bg-gray-100")} 
                  ${activeTab === item.id ? "text-white" : "text-gray-500"}
                  p-2 rounded-lg transition-colors
                `}>
                  {item.icon}
                </div>
                <span className="font-medium text-sm">{item.title}</span>
                {activeTab === item.id && (
                   <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full ${item.color.replace('bg-', 'bg-opacity-50 ')}`} />
                )}
              </button>
            ))}
          </nav>

          {/* Footer (Fixed at bottom of sidebar) */}
          <div className={`p-4 border-t space-y-3 shrink-0 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
             <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                <span className="text-xs font-bold uppercase ml-2 opacity-70">Motyw</span>
                <div className="flex gap-1">
                    <button onClick={() => setDarkMode(false)} className={`p-1.5 rounded ${!darkMode ? 'bg-white shadow text-yellow-600' : 'text-gray-400'}`}><Sun className="w-4 h-4" /></button>
                    <button onClick={() => setDarkMode(true)} className={`p-1.5 rounded ${darkMode ? 'bg-gray-600 shadow text-blue-300' : 'text-gray-400'}`}><Moon className="w-4 h-4" /></button>
                </div>
             </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* CONTENT AREA (Scrollable independently) */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scroll-smooth relative">
           <div className="max-w-5xl mx-auto animate-fade-in pb-20 mt-10">
              {renderContent()}
           </div>
        </main>
      </div>
    </div>
  );
}