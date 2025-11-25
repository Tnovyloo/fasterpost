"use client";

import { useEffect, useState, useCallback } from "react";

import MapPicker from "@/app/components/MapPicker";
import WarehouseMap from "@/app/components/WarehouseMap";

import dynamic from "next/dynamic";
import api from "@/axios/api";


// Connection selector component
function ConnectionSelector({ warehouses, selectedConnections, setSelectedConnections, currentWarehouseId }) {
  const availableWarehouses = warehouses.filter(w => w.id !== currentWarehouseId);

  const toggleConnection = (warehouseId) => {
    setSelectedConnections(prev => {
      if (prev.includes(warehouseId)) {
        return prev.filter(id => id !== warehouseId);
      } else {
        return [...prev, warehouseId];
      }
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Connected Warehouses
      </label>
      <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
        {availableWarehouses.length === 0 ? (
          <p className="text-sm text-gray-500">No other warehouses available</p>
        ) : (
          availableWarehouses.map(warehouse => (
            <label
              key={warehouse.id}
              className="flex items-center gap-3 py-2 hover:bg-gray-100 px-2 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedConnections.includes(warehouse.id)}
                onChange={() => toggleConnection(warehouse.id)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium">{warehouse.city}</span>
              <span className="text-xs text-gray-500 ml-auto">
                ({warehouse.latitude.toFixed(2)}, {warehouse.longitude.toFixed(2)})
              </span>
            </label>
          ))
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Selected: {selectedConnections.length} warehouse(s)
      </p>
    </div>
  );
}

export default function AdminWarehousesPage() {
  const API_BASE = "/api/admin/warehouses";

  // State
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Form & selection
  const [showForm, setShowForm] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [mapPosition, setMapPosition] = useState([52.2297, 21.0122]);

  const initialForm = {
    city: "",
    latitude: "",
    longitude: "",
    status: "active",
    connections: []
  };
  const [form, setForm] = useState(initialForm);
  const [selectedConnections, setSelectedConnections] = useState([]);

  // Auth
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  const getAuthConfig = () => {
    const token = getToken();
    return token ? { headers: { Authorization: `Token ${token}` } } : {};
  };

  // Fetch warehouses
  const fetchWarehouses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      params.append("page", page);
      params.append("page_size", pageSize);

      const res = await api.get(`${API_BASE}/?${params.toString()}`, getAuthConfig());
      const data = res.data;
      setWarehouses(Array.isArray(data.results) ? data.results : []);
      setTotalPages(Math.ceil((data.count || data.results?.length || 0) / pageSize) || 1);
    } catch (err) {
      setError(err.message);
      setWarehouses([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, pageSize]);

  // Sync form coordinates with map
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      latitude: mapPosition[0].toString(),
      longitude: mapPosition[1].toString(),
    }));
  }, [mapPosition]);

  // Handlers
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedWarehouse(null);
    setSelectedConnections([]);
    setMapPosition([52.2297, 21.0122]);
    setShowForm(false);
  };

  const saveWarehouse = async () => {
    if (!form.city || !form.latitude) {
      alert("Please fill city and set location on map");
      return;
    }

    const payload = {
      ...form,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      connections: selectedConnections
    };

    try {
      if (selectedWarehouse) {
        await api.put(`${API_BASE}/${selectedWarehouse.id}/`, payload, getAuthConfig());
      } else {
        await api.post(`${API_BASE}/`, payload, getAuthConfig());
      }
      resetForm();
      fetchWarehouses();
    } catch (err) {
      alert("Error: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  const editWarehouse = (warehouse) => {
    setSelectedWarehouse(warehouse);
    setShowForm(true);
    setForm({
      city: warehouse.city,
      latitude: warehouse.latitude.toString(),
      longitude: warehouse.longitude.toString(),
      status: warehouse.status,
    });
    setMapPosition([warehouse.latitude, warehouse.longitude]);
    
    // Extract connection IDs
    const connIds = warehouse.connections?.map(c => c.id) || [];
    setSelectedConnections(connIds);
    
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteWarehouse = async (id) => {
    if (!confirm("Delete this warehouse? This will also remove all its connections.")) return;
    try {
      await api.delete(`${API_BASE}/${id}/`, getAuthConfig());
      fetchWarehouses();
    } catch (err) {
      alert("Error: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  const filteredWarehouses = warehouses.filter(w => {
    const matchesSearch = !search || 
      w.city.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h1 className="text-4xl font-bold text-gray-900">Warehouse Management</h1>
          <p className="text-gray-600 mt-2">Manage warehouse locations and connections</p>
        </div>

        {/* Overview Map */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <h2 className="text-xl font-semibold">Network Overview</h2>
            <p className="text-sm opacity-90 mt-1">All warehouses and their connections</p>
          </div>
          <div className="p-6">
            <WarehouseMap warehouses={warehouses} />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="under_maintenance">Under Maintenance</option>
            </select>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {/* Warehouse Form */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div
            className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white cursor-pointer flex items-center justify-between"
            onClick={() => setShowForm(prev => !prev)}
          >
            <h2 className="text-xl font-semibold flex items-center gap-3">
              <span className="text-2xl">{showForm ? "▼" : "▶"}</span>
              {selectedWarehouse ? "Edit Warehouse" : "Create New Warehouse"}
            </h2>
            <span className="text-sm opacity-90">
              {showForm ? (selectedWarehouse ? `Editing: ${selectedWarehouse.city}` : 'Creating new') : "Click to expand"}
            </span>
          </div>

          {showForm && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left - Form */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Warsaw"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="under_maintenance">Under Maintenance</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                      <input
                        value={form.latitude}
                        readOnly
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                      <input
                        value={form.longitude}
                        readOnly
                        className="w-full px-4 py-2 border rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>

                  <ConnectionSelector
                    warehouses={warehouses}
                    selectedConnections={selectedConnections}
                    setSelectedConnections={setSelectedConnections}
                    currentWarehouseId={selectedWarehouse?.id}
                  />
                </div>

                {/* Right - Map */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Drag marker to set location
                  </label>
                  <MapPicker position={mapPosition} setPosition={setMapPosition} />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveWarehouse}
                  className="px-8 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition shadow-md"
                >
                  {selectedWarehouse ? "Update Warehouse" : "Create Warehouse"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Warehouses Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Warehouses</h2>
          </div>
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">City</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Connections</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredWarehouses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No warehouses found
                      </td>
                    </tr>
                  ) : (
                    filteredWarehouses.map(warehouse => (
                      <tr key={warehouse.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {warehouse.city}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            warehouse.status === 'active' ? 'bg-green-100 text-green-800' :
                            warehouse.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {warehouse.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {warehouse.latitude.toFixed(4)}, {warehouse.longitude.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {warehouse.connections?.length || 0} connection(s)
                          {warehouse.connections?.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {warehouse.connections.map((conn, idx) => {
                                const target = warehouses.find(w => w.id === conn.id);
                                return target ? (
                                  <div key={idx}>→ {target.city} ({conn.distance} km)</div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editWarehouse(warehouse)}
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteWarehouse(warehouse.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
            <div className="flex gap-2 text-sm">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-4 py-1">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}