// src/app/admin/page.jsx
"use client";

import Link from "next/link";
import { Package, Warehouse, Truck, Users, Home, LogOut, Menu } from "lucide-react";
import Header from "@/app/components/Header";
import { useState } from "react";

export default function AdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    {
      id: "home",
      title: "Dashboard Home",
      href: "/admin",
      icon: <Home className="w-5 h-5" />,
      color: "bg-indigo-600",
    },
    {
      id: "postmats",
      title: "Postmats & Stashes",
      href: "/admin/postmats",
      icon: <Package className="w-5 h-5" />,
      color: "bg-blue-600",
      badge: "Active",
    },
    {
      id: "warehouses",
      title: "Warehouses",
      href: "/admin/logistics",  // ← Unique path
      icon: <Warehouse className="w-5 h-5" />,
      color: "bg-green-600",
    },
    {
      id: "packages",
      title: "All Packages",
      href: "/admin/packages",
      icon: <Package className="w-5 h-5" />,
      color: "bg-purple-600",
    },
    {
      id: "accounts",
      title: "User Accounts",
      href: "/admin/accounts",
      icon: <Users className="w-5 h-5" />,
      color: "bg-pink-600",
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex">
        <Header />

        {/* Sidebar */}
        <div className={`${sidebarOpen ? "w-72" : "w-20"} transition-all duration-300 bg-white shadow-lg border-r border-gray-200 flex flex-col`}>
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600 text-white p-3 rounded-lg">
                <Package className="w-6 h-6" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
                  <p className="text-xs text-gray-500">Logistics Control Center</p>
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="ml-auto text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <Link
                key={item.id}  // ← NOW UNIQUE (id instead of href)
                href={item.href}
                className="group relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:bg-gray-50 hover:shadow-sm"
              >
                <div className={`${item.color} text-white p-2.5 rounded-lg`}>
                  {item.icon}
                </div>
                {sidebarOpen && (
                  <>
                    <span className="font-medium text-gray-700 group-hover:text-gray-900">
                      {item.title}
                    </span>
                    {item.badge && (
                      <span className="ml-auto bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {item.title}
                  </div>
                )}
              </Link>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200">
            <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition">
              <LogOut className="w-5 h-5" />
              {sidebarOpen && <span className="font-medium">Logout</span>}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8">
              <h2 className="text-4xl font-bold text-gray-800 mb-4">
                Welcome back, Admin
              </h2>
              <p className="text-lg text-gray-600">
                Select a module from the sidebar to begin.
              </p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Link href="/admin/postmats" className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 text-center hover:shadow-lg hover:border-blue-400 transition">
                <Package className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <p className="text-xl font-bold text-gray-800">Postmats</p>
                <p className="text-gray-600 mt-2">Manage lockers & stashes</p>
              </Link>
              <Link href="/admin/logistics" className="bg-green-50 border-2 border-green-200 rounded-xl p-8 text-center hover:shadow-lg hover:border-green-400 transition">
                <Warehouse className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-xl font-bold text-gray-800">Warehouses</p>
                <p className="text-gray-600 mt-2">Hubs & inventory</p>
              </Link>
              <Link href="/admin/packages" className="bg-purple-50 border-2 border-purple-200 rounded-xl p-8 text-center hover:shadow-lg hover:border-purple-400 transition">
                <Package className="w-16 h-16 text-purple-600 mx-auto mb-4" />
                <p className="text-xl font-bold text-gray-800">Packages</p>
                <p className="text-gray-600 mt-2">Track all shipments</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}