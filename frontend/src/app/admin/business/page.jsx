"use client";

import Link from "next/link";
import { Package, Warehouse, Truck, Users, Home, LogOut, Menu, Briefcase, Check, X, Trash2 } from "lucide-react";
import Header from "@/app/components/Header";
import { useState, useEffect } from "react";

export default function AdminBusinessPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      href: "/admin/logistics",
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
      href: "/admin/users",
      icon: <Users className="w-5 h-5" />,
      color: "bg-pink-600",
    },
    {
      id: "business",
      title: "Business Requests",
      href: "/admin/business",
      icon: <Briefcase className="w-5 h-5" />,
      color: "bg-orange-600",
    },
  ];

  const fetchRequests = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/business/admin/requests", {
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch requests");
      const data = await response.json();

      // Handle DRF pagination (data.results) or direct list (data)
      if (Array.isArray(data)) {
        setRequests(data);
      } else if (data && Array.isArray(data.results)) {
        setRequests(data.results);
      } else {
        setRequests([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id, action) => {
    if (action === "delete" && !confirm("Are you sure you want to delete this request?")) return;

    try {
      const response = await fetch(`http://localhost:8000/api/business/admin/requests/${id}/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} request`);

      // Refresh list
      fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex mt-10">
        <Header />

        {/* Sidebar */}
        <div className={`${sidebarOpen ? "w-72" : "w-20"} transition-all duration-300 bg-white shadow-lg border-r border-gray-200 flex flex-col mt-4`}>
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
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto text-gray-500 hover:text-gray-700">
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => (
              <Link key={item.id} href={item.href} className={`group relative flex items-center gap-4 px-4 py-3 rounded-xl transition-all hover:bg-gray-50 hover:shadow-sm ${item.id === 'business' ? 'bg-gray-50 shadow-sm' : ''}`}>
                <div className={`${item.color} text-white p-2.5 rounded-lg`}>{item.icon}</div>
                {sidebarOpen && <span className="font-medium text-gray-700 group-hover:text-gray-900">{item.title}</span>}
              </Link>
            ))}
          </nav>

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
              <h2 className="text-3xl font-bold text-gray-800 mb-6">Business Requests</h2>

              {loading ? (
                <p>Loading requests...</p>
              ) : error ? (
                <p className="text-red-500">{error}</p>
              ) : !Array.isArray(requests) || requests.length === 0 ? (
                <p className="text-gray-500">No pending business requests found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 text-sm">
                        <th className="pb-3 font-medium">Company</th>
                        <th className="pb-3 font-medium">Tax ID</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {requests.map((req) => (
                        <tr key={req.id} className="group hover:bg-gray-50">
                          <td className="py-4 font-medium text-gray-800">{req.company_name}</td>
                          <td className="py-4 text-gray-600">{req.tax_id}</td>
                          <td className="py-4 text-gray-600">{new Date(req.created_at).toLocaleDateString()}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === "APPROVED" ? "bg-green-100 text-green-700" : req.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{req.status}</span>
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {req.status === "PENDING" && (
                                <>
                                  <button onClick={() => handleAction(req.id, "approve")} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition" title="Approve">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleAction(req.id, "reject")} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Reject">
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              <button onClick={() => handleAction(req.id, "delete")} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}