"use client";

import { Package, Warehouse, Map, Users, Briefcase } from "lucide-react";

export default function DashboardHome({ setActiveTab }) {
  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-4xl font-bold text-gray-800 mb-2">
          Welcome back, Admin
        </h2>
        <p className="text-lg text-gray-600">
          Select a module from the sidebar or choose a quick action below.
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button 
          onClick={() => setActiveTab('routes')}
          className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-8 text-center hover:shadow-xl hover:border-orange-400 hover:-translate-y-1 transition duration-300 group"
        >
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition">
             <Map className="w-10 h-10 text-orange-600" />
          </div>
          <p className="text-xl font-bold text-gray-800">Logistics Control</p>
          <p className="text-gray-600 mt-2 text-sm">Manage routes & line hauls</p>
        </button>

        <button 
          onClick={() => setActiveTab('postmats')}
          className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 text-center hover:shadow-xl hover:border-blue-400 hover:-translate-y-1 transition duration-300 group"
        >
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition">
             <Package className="w-10 h-10 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-gray-800">Postmats</p>
          <p className="text-gray-600 mt-2 text-sm">Manage lockers & stashes</p>
        </button>

        <button 
          onClick={() => setActiveTab('warehouses')}
          className="bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center hover:shadow-xl hover:border-green-400 hover:-translate-y-1 transition duration-300 group"
        >
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition">
             <Warehouse className="w-10 h-10 text-green-600" />
          </div>
          <p className="text-xl font-bold text-gray-800">Warehouses</p>
          <p className="text-gray-600 mt-2 text-sm">Hubs & inventory</p>
        </button>

        <button 
          onClick={() => setActiveTab('packages')}
          className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-8 text-center hover:shadow-xl hover:border-purple-400 hover:-translate-y-1 transition duration-300 group"
        >
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition">
             <Package className="w-10 h-10 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-gray-800">All Packages</p>
          <p className="text-gray-600 mt-2 text-sm">Track shipments & status</p>
        </button>

        <button 
          onClick={() => setActiveTab('users')}
          className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-8 text-center hover:shadow-xl hover:border-pink-400 hover:-translate-y-1 transition duration-300 group"
        >
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition">
             <Users className="w-10 h-10 text-pink-600" />
          </div>
          <p className="text-xl font-bold text-gray-800">User Accounts</p>
          <p className="text-gray-600 mt-2 text-sm">Manage couriers & users</p>
        </button>

        <button 
          onClick={() => setActiveTab('business')}
          className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-8 text-center hover:shadow-xl hover:border-orange-400 hover:-translate-y-1 transition duration-300 group"
        >
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm group-hover:scale-110 transition">
             <Briefcase className="w-10 h-10 text-orange-600" />
          </div>
          <p className="text-xl font-bold text-gray-800">Business Requests</p>
          <p className="text-gray-600 mt-2 text-sm">Approve B2B applications</p>
        </button>
      </div>
    </div>
  );
}