"use client";

import { useEffect, useState, useCallback } from "react";
import Header from "@/app/components/Header";
import dynamic from "next/dynamic";
import api from "@/axios/api";

// Connection selector component
// NOW uses 'allWarehouses' so you can connect to cities not on the current page
function ConnectionSelector({ warehouses, selectedConnections, setSelectedConnections, currentWarehouseId }) {
  // Filter out self
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
      <label className="block text-sm font-semibold text-gray-800">
        Connected Warehouses
      </label>
      <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
        {availableWarehouses.length === 0 ? (
          <p className="text-sm text-gray-600 italic p-2">No other warehouses available</p>
        ) : (
          availableWarehouses.map(warehouse => (
            <label
              key={warehouse.id}
              className="flex items-center gap-3 py-2.5 px-3 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 rounded-md cursor-pointer transition-all"
            >
              <input
                type="checkbox"
                checked={selectedConnections.includes(warehouse.id)}
                onChange={() => toggleConnection(warehouse.id)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-800">{warehouse.city}</span>
              <span className="text-xs text-gray-500 ml-auto font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                {warehouse.latitude.toFixed(2)}, {warehouse.longitude.toFixed(2)}
              </span>
            </label>
          ))
        )}
      </div>
      <p className="text-xs text-gray-600 font-medium mt-2 px-1">
        Selected: <span className="text-blue-600 font-bold">{selectedConnections.length}</span> warehouse(s)
      </p>
    </div>
  );
}

export default function AdminWarehousesPage() {
  const API_BASE = "/api/admin/warehouses";

  // State
  const [warehouses, setWarehouses] = useState([]); // Paginated data (for table)
  const [allWarehouses, setAllWarehouses] = useState([]); // FULL data (for map & connections)
  
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

  // 1. Fetch Paginated Warehouses (For Table)
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

  // 2. Fetch ALL Warehouses (For Map & Connections)
  const fetchAllWarehouses = useCallback(async () => {
    try {
      // We request a large page size to get everything for the map/dropdowns
      // Alternatively, your API could have a 'all=true' query param
      const res = await api.get(`${API_BASE}/?page_size=1000`, getAuthConfig());
      const data = res.data;
      setAllWarehouses(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      console.error("Failed to load map data", err);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  useEffect(() => {
    fetchAllWarehouses();
  }, [fetchAllWarehouses]);

  // Reset page when filters change
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
      fetchWarehouses();      // Refresh table
      fetchAllWarehouses();   // Refresh map/connections
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
      fetchWarehouses();      // Refresh table
      fetchAllWarehouses();   // Refresh map
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

  const MapPicker = dynamic(() => import("@/app/components/MapPicker"), {
      ssr: false,
      loading: () => (
       <div className="h-96 rounded-lg border bg-gray-50 flex items-center justify-center">
         <p className="text-gray-500">Loading map...</p>
       </div>
      ),
  });

  const WarehouseMap = dynamic(() => import("@/app/components/WarehouseMap"), {
      ssr: false,
      loading: () => (
       <div className="h-96 rounded-lg border bg-gray-50 flex items-center justify-center">
         <p className="text-gray-500">Loading map...</p>
       </div>
      ),
  });

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Header />
      <div className="max-w-7xl mx-auto space-y-8 mt-10">
        {/* Header */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <h1 className="text-4xl font-bold text-gray-900">Warehouse Management</h1>
          <p className="text-gray-600 mt-2 font-medium">Manage warehouse locations and connections</p>
        </div>

        {/* Overview Map - NOW USES ALL WAREHOUSES */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
            <h2 className="text-xl font-bold">Network Overview</h2>
            <p className="text-sm opacity-90 mt-1 font-medium">
               Showing {allWarehouses.length} locations across Poland
            </p>
          </div>
          <div className="p-6">
            {/* FIX: Use allWarehouses here so the map is complete */}
            <WarehouseMap warehouses={allWarehouses} />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search by city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="under_maintenance">Under Maintenance</option>
            </select>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {/* Warehouse Form */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div
            className="px-6 py-4 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 cursor-pointer flex items-center justify-between transition-colors"
            onClick={() => setShowForm(prev => !prev)}
          >
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <span className="text-2xl text-blue-600">{showForm ? "▼" : "▶"}</span>
              {selectedWarehouse ? "Edit Warehouse" : "Create New Warehouse"}
            </h2>
            <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
              {showForm ? (selectedWarehouse ? `Editing: ${selectedWarehouse.city}` : 'Creating new') : "Click to expand"}
            </span>
          </div>

          {showForm && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left - Form */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">City *</label>
                    <input
                      name="city"
                      value={form.city}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="e.g. Warsaw"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="under_maintenance">Under Maintenance</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Latitude</label>
                      <input
                        value={form.latitude}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Longitude</label>
                      <input
                        value={form.longitude}
                        readOnly
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* FIX: Use allWarehouses here so you can connect to off-page cities */}
                  <ConnectionSelector
                    warehouses={allWarehouses}
                    selectedConnections={selectedConnections}
                    setSelectedConnections={setSelectedConnections}
                    currentWarehouseId={selectedWarehouse?.id}
                  />
                </div>

                {/* Right - Map */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Drag marker to set location
                  </label>
                  <MapPicker position={mapPosition} setPosition={setMapPosition} />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={resetForm}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveWarehouse}
                  className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-md"
                >
                  {selectedWarehouse ? "Update Warehouse" : "Create Warehouse"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Warehouses Table - USES PAGINATED WAREHOUSES */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">Warehouses Directory</h2>
          </div>
          {loading ? (
            <div className="p-10 text-center text-gray-600 font-medium animate-pulse">Loading data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">City</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Connections</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredWarehouses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                        No warehouses found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    filteredWarehouses.map(warehouse => (
                      <tr key={warehouse.id} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {warehouse.city}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            warehouse.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' :
                            warehouse.status === 'inactive' ? 'bg-red-100 text-red-800 border-red-200' :
                            'bg-orange-100 text-orange-800 border-orange-200'
                          }`}>
                            {warehouse.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 font-mono">
                          {warehouse.latitude.toFixed(4)}, {warehouse.longitude.toFixed(4)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          <div className="font-medium mb-1">
                            {warehouse.connections?.length || 0} connection(s)
                          </div>
                          {warehouse.connections?.length > 0 && (
                            <div className="text-xs text-gray-500 space-y-0.5">
                              {warehouse.connections.map((conn, idx) => {
                                // FIX: Use allWarehouses to find target name, otherwise off-page links are "Unknown"
                                const target = allWarehouses.find(w => w.id === conn.id);
                                return (
                                  <div key={idx} className="flex items-center gap-1">
                                    <span className="text-gray-400">↳</span> 
                                    <span className="font-medium text-gray-700">{target ? target.city : 'Unknown'}</span>
                                    <span className="text-gray-400">({conn.distance} km)</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => editWarehouse(warehouse)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded shadow-sm hover:bg-blue-700 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteWarehouse(warehouse.id)}
                              className="px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold rounded shadow-sm hover:bg-red-50 transition"
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
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex gap-2 text-sm font-medium text-gray-700">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                First
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Prev
              </button>
              <span className="px-4 py-1 flex items-center bg-gray-200 rounded text-gray-800">
                 Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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