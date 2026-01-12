"use client";

import Link from "next/link";
import Header from "@/app/components/Header";
import { useState } from "react";
import { 
  Package as PackageIcon, 
  Warehouse, 
  Users, 
  Home, 
  Menu, 
  Map, 
  LogOut,
  Truck,
  BarChart3,
  Briefcase 
} from "lucide-react";

// Import Views
import DashboardHome from "./views/DashboardHome";
import PostmatsView from "./views/PostmatsView";
import WarehousesView from "./views/WarehousesView";
import PackagesView from "./views/PackagesView";
import UsersView from "./views/UsersView";
import RoutesView from "./views/RoutesView";
import BusinessRequestsView from "./views/BusinessRequestsView";

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("home");

  const goBack = () => setActiveTab("home");

  const menuItems = [
    {
      id: "home",
      title: "Dashboard Home",
      icon: <Home className="w-5 h-5" />,
      color: "bg-indigo-600",
      view: <DashboardHome setActiveTab={setActiveTab} />,
    },
    {
      id: "routes",
      title: "Logistics Control",
      icon: <Map className="w-5 h-5" />,
      color: "bg-orange-600",
      view: <RoutesView goBack={goBack} />,
    },
    {
      id: "postmats",
      title: "Postmats & Stashes",
      icon: <PackageIcon className="w-5 h-5" />,
      color: "bg-blue-600",
      view: <PostmatsView goBack={goBack} />,
    },
    {
      id: "warehouses",
      title: "Warehouses",
      icon: <Warehouse className="w-5 h-5" />,
      color: "bg-green-600",
      view: <WarehousesView goBack={goBack} />,
    },
    {
      id: "packages",
      title: "All Packages",
      icon: <PackageIcon className="w-5 h-5" />,
      color: "bg-purple-600",
      view: <PackagesView goBack={goBack} />,
    },
    {
      id: "users",
      title: "User Accounts",
      icon: <Users className="w-5 h-5" />,
      color: "bg-pink-600",
      view: <UsersView goBack={goBack} />,
    },
    {
      id: "business",
      title: "Business Requests",
      icon: <Briefcase className="w-5 h-5" />,
      color: "bg-orange-600",
      view: <BusinessRequestsView />,
    },
  ];

  const activeContent = menuItems.find(item => item.id === activeTab)?.view || <DashboardHome setActiveTab={setActiveTab} />;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header />
      
      <div className="flex flex-1 pt-16 h-[calc(100vh-64px)] overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`${
            sidebarOpen ? "w-72" : "w-20"
          } transition-all duration-300 bg-white shadow-xl z-20 flex flex-col border-r border-gray-200`}
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center w-full"}`}>
               <div className="bg-indigo-600 text-white p-2 rounded-lg shrink-0">
                  <BarChart3 className="w-6 h-6" />
               </div>
               {sidebarOpen && (
                 <div>
                   <h1 className="font-bold text-gray-800 leading-tight">Admin Panel</h1>
                   <p className="text-[10px] text-gray-500 uppercase tracking-wider">Logistics OS</p>
                 </div>
               )}
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                  ${activeTab === item.id 
                    ? "bg-gray-50 text-gray-900 shadow-sm ring-1 ring-gray-200" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <div className={`
                  ${activeTab === item.id ? item.color : "bg-gray-100 group-hover:bg-white"} 
                  ${activeTab === item.id ? "text-white" : "text-gray-500"}
                  p-2 rounded-lg transition-colors
                `}>
                  {item.icon}
                </div>
                
                {sidebarOpen && (
                  <span className="font-medium text-sm">{item.title}</span>
                )}

                {/* Tooltip for collapsed state */}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap pointer-events-none">
                    {item.title}
                  </div>
                )}
                
                {/* Active Indicator Line */}
                {activeTab === item.id && sidebarOpen && (
                   <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-l-full ${item.color.replace('bg-', 'bg-opacity-50 ')}`} />
                )}
              </button>
            ))}
          </nav>

          {/* Footer Controls */}
          <div className="p-3 border-t border-gray-100">
             <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-full flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition"
             >
                <Menu className="w-5 h-5" />
             </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 p-6 scroll-smooth">
           <div className="max-w-[1600px] mx-auto animate-fade-in pb-20">
              {activeContent}
           </div>
        </main>
      </div>
    </div>
  );
}