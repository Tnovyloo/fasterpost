"use client";

import { Package, Settings, UserCircle, LogOut, PlusCircle, Inbox } from "lucide-react";
import api from "@/axios/api";
import { useRouter } from "next/navigation";

export default function DashboardSidebar({ activeView, setActiveView, onSendPackage }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
        await api.post("/accounts/user/logout/");
    } catch(e) {
        console.error("Logout error", e);
    } finally {
        localStorage.removeItem("token");
        router.push("/login");
    }
  };

  const navItems = [
    { id: "parcels", label: "My Parcels", icon: <Package className="w-5 h-5" /> },
    { id: "incoming", label: "Incoming Parcels", icon: <Inbox className="w-5 h-5" /> },
    { id: "settings", label: "Settings", icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <nav className="flex flex-col h-full space-y-6 sticky top-28">
      
      {/* User Info Card */}
      <div className="px-5 py-6 bg-white/80 backdrop-blur rounded-3xl shadow-sm border border-blue-100 flex items-center gap-4 transition hover:shadow-md">
        <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-inner">
            <UserCircle className="w-7 h-7" />
        </div>
        <div className="overflow-hidden">
            <p className="text-sm font-bold text-gray-900 truncate">My Account</p>
            <p className="text-xs text-gray-500 font-medium">User Dashboard</p>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="space-y-2 flex-1">
        {/* Special 'Send Package' Action */}
        <button
          onClick={onSendPackage}
          className="w-full flex items-center gap-3 px-5 py-4 mb-6 rounded-2xl font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-200"
        >
          <PlusCircle className="w-5 h-5" />
          Send Package
        </button>

        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-medium transition-all duration-200 group
              ${
                activeView === item.id
                  ? "bg-white text-blue-700 shadow-md border border-blue-50"
                  : "text-gray-600 hover:bg-white/60 hover:text-gray-900"
              }
            `}
          >
            <span className={`p-2 rounded-lg transition-colors ${activeView === item.id ? "bg-blue-100" : "bg-gray-100 group-hover:bg-white"}`}>
                {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </div>

      {/* Footer Actions */}
      <div className="pt-6 mt-auto border-t border-gray-200/50">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-5 py-3 rounded-xl font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
            <span className="p-2 bg-red-50 rounded-lg">
                <LogOut className="w-4 h-4" />
            </span>
            Sign Out
        </button>
      </div>
    </nav>
  );
}