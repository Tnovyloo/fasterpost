"use client";

import { useState, useEffect } from "react";
import api from "@/axios/api";
import Header from "@/app/components/Header";

export default function PackagesAdminPage() {
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [stats, setStats] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");

  const [loading, setLoading] = useState(false);          // only for major loads
  const [tableLoading, setTableLoading] = useState(false); // for filters


  // Debounced fetch
  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchPackages();
      fetchStats();
    }, 500);

    return () => clearTimeout(debounce);
  }, [searchTerm, statusFilter, sizeFilter]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (statusFilter) params.append("status", statusFilter);
      if (sizeFilter) params.append("size", sizeFilter);

      const res = await api.get(`/api/admin/packages/?${params.toString()}`);
      const data = res.data.results || res.data;

      setPackages(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch packages:", err);
      setError("Failed to load packages");
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/api/admin/packages/stats/");
      setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setStats(null);
    }
  };

  const fetchPackageDetails = async (packageId) => {
    try {
      const res = await api.get(`/api/admin/packages/${packageId}/`);
      setSelectedPackage(res.data);
      setEditForm(res.data);
      setIsEditing(false);
      setShowDetails(true);
    } catch (err) {
      console.error("Failed to fetch package details:", err);
      alert("Failed to load package details");
    }
  };

  const handleUpdateStatus = async (packageId, newStatus) => {
    try {
      await api.post(`/api/admin/packages/${packageId}/update_status/`, {
        status: newStatus,
      });
      alert("Status updated successfully!");
      fetchPackages();
      if (selectedPackage?.id === packageId) fetchPackageDetails(packageId);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status");
    }
  };

  const handleUpdatePackage = async () => {
    try {
      const res = await api.put(
        `/api/admin/packages/${selectedPackage.id}/`,
        editForm
      );

      alert("Package updated successfully!");
      setSelectedPackage(res.data);
      setIsEditing(false);
      fetchPackages();
    } catch (err) {
      console.error("Failed to update package:", err);
      alert("Failed to update package");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      created: "bg-gray-100 text-gray-800",
      placed_in_stash: "bg-blue-100 text-blue-800",
      in_transit: "bg-yellow-100 text-yellow-800",
      in_warehouse: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      picked_up: "bg-indigo-100 text-indigo-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getSizeColor = (size) => {
    const colors = {
      small: "bg-emerald-100 text-emerald-800",
      medium: "bg-amber-100 text-amber-800",
      large: "bg-rose-100 text-rose-800",
    };
    return colors[size] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8 pt-24 text-black">
      <Header></Header>

      {/* LOADING OVERLAY (does NOT remount page) */}
      {loading && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Package Management</h1>

          <button
            onClick={fetchPackages}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-sm text-gray-600">Total Packages</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats.total_packages}
              </p>
            </div>

            {stats.by_status?.map((stat) => (
              <div key={stat.status} className="bg-white rounded-lg shadow p-6">
                <p className="text-sm text-gray-600 capitalize">
                  {stat.status.replace("_", " ")}
                </p>
                <p className="text-3xl font-bold text-gray-900">{stat.count}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by code, name, phone, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="created">Created</option>
              <option value="placed_in_stash">Placed in Stash</option>
              <option value="in_transit">In Transit</option>
              <option value="in_warehouse">In Warehouse</option>
              <option value="delivered">Delivered</option>
              <option value="picked_up">Picked Up</option>
            </select>

            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Sizes</option>
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pickup Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    From → To
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Receiver
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-blue-600">
                      {pkg.pickup_code || "N/A"}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {pkg.origin_postmat_name}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">
                          {pkg.destination_postmat_name}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <p className="font-medium">{pkg.receiver_name}</p>
                      <p className="text-gray-500">{pkg.receiver_phone}</p>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getSizeColor(
                          pkg.size
                        )}`}
                      >
                        {pkg.size}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm">{pkg.weight}g</td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          pkg.latest_status
                        )}`}
                      >
                        {pkg.latest_status?.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => fetchPackageDetails(pkg.id)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {packages.length === 0 && !loading && (
          <div className="text-center py-12 bg-white rounded-lg shadow mt-6">
            <p className="text-gray-500">No packages found</p>
          </div>
        )}
      </div>

      {/* DETAILS MODAL */}
      {showDetails && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">

              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Package Details</h2>

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>

                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* INFO BLOCK */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Size
                  </label>
                  {isEditing ? (
                    <select
                      value={editForm.size}
                      onChange={(e) =>
                        setEditForm({ ...editForm, size: e.target.value })
                      }
                      className="px-3 py-2 border rounded-lg w-full"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  ) : (
                    <span
                      className={`px-3 py-1 text-sm font-semibold rounded-full ${getSizeColor(
                        selectedPackage.size
                      )}`}
                    >
                      {selectedPackage.size}
                    </span>
                  )}
                </div>

                {/* Weight */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Weight (g)
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.weight}
                      onChange={(e) =>
                        setEditForm({ ...editForm, weight: e.target.value })
                      }
                      className="px-3 py-2 border rounded-lg w-full"
                    />
                  ) : (
                    <p className="font-medium">{selectedPackage.weight}g</p>
                  )}
                </div>

                {/* Receiver Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Receiver Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.receiver_name}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          receiver_name: e.target.value,
                        })
                      }
                      className="px-3 py-2 border rounded-lg w-full"
                    />
                  ) : (
                    <p>{selectedPackage.receiver_name}</p>
                  )}
                </div>

                {/* Receiver Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Receiver Phone
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.receiver_phone}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          receiver_phone: e.target.value,
                        })
                      }
                      className="px-3 py-2 border rounded-lg w-full"
                    />
                  ) : (
                    <p>{selectedPackage.receiver_phone}</p>
                  )}
                </div>
              </div>

              {/* STATUS HISTORY */}
              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold text-lg mb-4">Status History</h3>
                <div className="space-y-3">
                  {selectedPackage.actualizations?.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                    >
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                          act.status
                        )}`}
                      >
                        {act.status.replace("_", " ")}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(act.created_at).toLocaleString()}
                      </span>

                      {act.warehouse_name && (
                        <span className="text-sm text-gray-600">
                          @ {act.warehouse_name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* UPDATE STATUS */}
              <div className="border-t pt-6 mt-6">
                <h3 className="font-semibold text-lg mb-4">Update Status</h3>
                <div className="flex gap-2 flex-wrap">
                  {[
                    "placed_in_stash",
                    "in_transit",
                    "in_warehouse",
                    "delivered",
                    "picked_up",
                  ].map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        handleUpdateStatus(selectedPackage.id, status)
                      }
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Set {status.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {isEditing && (
                <div className="mt-6">
                  <button
                    onClick={handleUpdatePackage}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Save Changes
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
