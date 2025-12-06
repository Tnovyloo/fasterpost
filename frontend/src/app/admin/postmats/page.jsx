"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/axios/api";
import Header from "@/app/components/Header";
import PostmatRow from "@/app/components/PostmatRow";
import dynamic from "next/dynamic";

export default function AdminPostmatsPage() {
  const API_BASE_POSTMAT = "api/admin/postmats";
  const API_BASE_STASH = "api/admin/stashes";

  // ── State ─────────────────────────────────────
  const [postmats, setPostmats] = useState([]);
  const [stashes, setStashes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("name");

  // Form & selection
  const [showPostmatForm, setShowPostmatForm] = useState(false);
  const [selectedPostmat, setSelectedPostmat] = useState(null);
  const [showStashForm, setShowStashForm] = useState(false);
  const [selectedStash, setSelectedStash] = useState(null);

  // Map position (default somewhere in Europe – change if you want)
  const [mapPosition, setMapPosition] = useState([52.2297, 21.0122]);

  const initialPostmatForm = {
    warehouse_id: "",
    name: "",
    status: "active",
    latitude: "",
    longitude: "",
    postal_code: "",
    stashes: []
  };
  const [postmatForm, setPostmatForm] = useState(initialPostmatForm);

  const initialStashForm = {
    postmat: "",
    size: "medium",
    is_empty: true,
    reserved_until: null,
    clear_reserved_until: false
  };
  const [stashForm, setStashForm] = useState(initialStashForm);

  // ── Auth ───────────────────────────────────────
  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  const getAuthConfig = () => {
    const token = getToken();
    return token ? { headers: { Authorization: `Token ${token}` } } : {};
  };

  // ── Fetch data ─────────────────────────────────
  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/warehouses/simple", getAuthConfig());
      setWarehouses(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const MapPicker = dynamic(() => import("@/app/components/MapPicker"), {
    ssr: false,
    loading: () => (
      <div className="h-96 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-medium">Loading map...</p>
      </div>
    ),
  });

  const fetchPostmats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      if (warehouseFilter) params.append("warehouse", warehouseFilter);
      if (sortBy) params.append("ordering", sortBy);
      params.append("page", page);
      params.append("page_size", pageSize);

      const res = await api.get(API_BASE_POSTMAT + "/", { params, ...getAuthConfig() });
      const data = res.data;
      setPostmats(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
      setTotalPages(Math.ceil((data.count || data.length) / pageSize) || 1);
    } catch (err) {
      setError(err.response?.data || err.message);
      setPostmats([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, warehouseFilter, sortBy]);

  const fetchStashes = async () => {
    try {
      const res = await api.get(API_BASE_STASH + "/", getAuthConfig());
      setStashes(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchPostmats();
    fetchStashes();
  }, [fetchPostmats, fetchWarehouses]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, warehouseFilter, pageSize]);

  // Keep form latitude/longitude in sync with map
  useEffect(() => {
    setPostmatForm(prev => ({
      ...prev,
      latitude: mapPosition[0].toString(),
      longitude: mapPosition[1].toString(),
    }));
  }, [mapPosition]);

  // ── Handlers ───────────────────────────────────
  const handlePostmatChange = e => {
    const { name, value } = e.target;
    setPostmatForm(prev => ({ ...prev, [name]: value }));
  };

  const handleStashChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "clear_reserved_until") {
      setStashForm(prev => ({
        ...prev,
        clear_reserved_until: checked,
        reserved_until: checked ? null : prev.reserved_until
      }));
      return;
    }

    // For datetime-local: just add seconds if needed
    if (name === "reserved_until" && value && value.length === 16) {
      setStashForm(prev => ({ ...prev, reserved_until: value + ":00" }));
    } else {
      setStashForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    }
  };

  const resetPostmatForm = () => {
    setPostmatForm(initialPostmatForm);
    setSelectedPostmat(null);
    setMapPosition([52.2297, 21.0122]);
    setShowPostmatForm(false)
  };

  const resetStashForm = () => {
    setStashForm(initialStashForm);
    setSelectedStash(null);
    setShowStashForm(false);
  };

  const savePostmat = async () => {
    if (!postmatForm.warehouse_id || !postmatForm.name || !postmatForm.latitude) {
      alert("Please fill warehouse, name and click on the map to set location");
      return;
    }
    try {
      if (selectedPostmat) {
        await api.put(`${API_BASE_POSTMAT}/${selectedPostmat.id}/`, postmatForm, getAuthConfig());
      } else {
        await api.post(API_BASE_POSTMAT + "/", postmatForm, getAuthConfig());
      }
      resetPostmatForm();
      fetchPostmats();
    } catch (err) {
      alert("Error: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  const saveStash = async () => {
    try {
      if (selectedStash) {
        await api.put(`${API_BASE_STASH}/${selectedStash.id}/`, stashForm, getAuthConfig());
      } else {
        await api.post(API_BASE_STASH + "/", stashForm, getAuthConfig());
      }
      resetStashForm();
      fetchStashes();
      fetchPostmats();
    } catch (err) {
      alert("Error: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  const editPostmat = pm => {
    setSelectedPostmat(pm);
    setShowPostmatForm(true);
    setPostmatForm({
      warehouse_id: pm.warehouse_id || pm.warehouse?.id || "",
      name: pm.name,
      status: pm.status,
      latitude: pm.latitude.toString(),
      longitude: pm.longitude.toString(),
      postal_code: pm.postal_code || "",
    });
    setMapPosition([pm.latitude, pm.longitude]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const editStash = stash => {
    setSelectedStash(stash);
    setStashForm({
      postmat: stash.postmat?.id || stash.postmat,
      size: stash.size,
      is_empty: stash.is_empty,
      reserved_until: stash.reserved_until ? stash.reserved_until.slice(0, 16) : "",
    });
    setShowStashForm(true);
  };

  const deletePostmat = async id => {
    if (!confirm("Delete this postmat and all its stashes?")) return;
    await api.delete(`${API_BASE_POSTMAT}/${id}/`, getAuthConfig());
    fetchPostmats();
    fetchStashes();
  };

  const deleteStash = async id => {
    if (!confirm("Delete this stash?")) return;
    await api.delete(`${API_BASE_STASH}/${id}/`, getAuthConfig());
    fetchPostmats();
    fetchStashes();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <Header />
      <div className="max-w-7xl mx-auto space-y-8 mt-10">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <h1 className="text-4xl font-bold text-gray-900">Postmats & Stashes</h1>
          <p className="text-gray-600 mt-2 font-medium">Manage final delivery points and locker configurations</p>
        </div>

        {/* Filters + Sorting */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Filters & Sorting</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search name/postal code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            />

            {/* Status Filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>

            {/* Warehouse Filter */}
            <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
              <option value="">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} – {w.city}
                </option>
              ))}
            </select>

            {/* Sorting Dropdown */}
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)} 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-medium"
            >
              <option value="">Default Sort</option>
              <option value="name">Name (A → Z)</option>
              <option value="-name">Name (Z → A)</option>
              <option value="status">Status</option>
              <option value="-status">Status (desc)</option>
            </select>

            {/* Page Size */}
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Postmat Form – Collapsible Card */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div 
            className="px-6 py-4 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 cursor-pointer flex items-center justify-between transition-colors"
            onClick={() => setShowPostmatForm(prev => !prev)}
          >
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <span className="text-2xl text-indigo-600">{showPostmatForm ? "▼" : "▶"}</span>
              {selectedPostmat ? "Edit Postmat" : "Create New Postmat"}
            </h2>
            <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
              {showPostmatForm ? (selectedPostmat ? `Editing: ${selectedPostmat.name}` : 'Creating new') : "Click to expand"}
            </span>
          </div>

          {showPostmatForm && (
            <div className="p-6 space-y-6 bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left – Form */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Warehouse *</label>
                    <select
                      name="warehouse_id"
                      value={postmatForm.warehouse_id}
                      onChange={handlePostmatChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map(w => (
                        <option key={w.id} value={w.id}>
                          {w.name} – {w.city}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Name (max 6 chars) *</label>
                    <input
                      name="name"
                      maxLength={6}
                      value={postmatForm.name}
                      onChange={handlePostmatChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                    <select name="status" value={postmatForm.status} onChange={handlePostmatChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Latitude</label>
                      <input value={postmatForm.latitude} readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">Longitude</label>
                      <input value={postmatForm.longitude} readOnly className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Postal Code (optional)</label>
                    <input
                      name="postal_code"
                      value={postmatForm.postal_code}
                      onChange={handlePostmatChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="e.g. 00-000"
                    />
                  </div>
                </div>

                {/* Right – Map */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Click map to set location</label>
                  <MapPicker position={mapPosition} setPosition={setMapPosition} />
                </div>
              </div>

              {/* Button Bar – Fixed at bottom */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={resetPostmatForm}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={savePostmat}
                  className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-md"
                >
                  {selectedPostmat ? "Update Postmat" : "Create Postmat"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stash Form – Same style */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mt-8">
          <div 
            className="px-6 py-4 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 cursor-pointer flex items-center justify-between transition-colors"
            onClick={() => setShowStashForm(prev => !prev)}
          >
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
              <span className="text-2xl text-blue-600">{showStashForm ? "▼" : "▶"}</span>
              {selectedStash ? "Edit Stash" : "Add New Stash"}
            </h2>
            <span className="text-sm font-medium text-gray-600 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
              {showStashForm ? (selectedStash ? `Editing: Stash` : 'Creating: New stash') : "Click to expand"}
            </span>
          </div>

          {showStashForm && (
            <div className="p-6 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Postmat *</label>
                  <select name="postmat" value={stashForm.postmat} onChange={handleStashChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" required>
                    <option value="">Select Postmat</option>
                    {postmats.map(pm => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Size</label>
                  <select name="size" value={stashForm.size} onChange={handleStashChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div className="flex items-end mb-2">
                  <label className="flex items-center gap-3 cursor-pointer p-2 border border-red-100 rounded-lg bg-red-50 hover:bg-red-100 transition w-full">
                    <input
                      type="checkbox"
                      name="clear_reserved_until"
                      checked={stashForm.clear_reserved_until || false}
                      onChange={handleStashChange}
                      className="w-5 h-5 text-red-600 rounded border-red-300 focus:ring-red-500"
                    />
                    <span className="text-sm font-bold text-red-700">Clear reserved until</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Reserved Until (optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="reserved_until"
                    value={stashForm.clear_reserved_until ? "" : (stashForm.reserved_until?.slice(0, 16) || "")}
                    onChange={handleStashChange}
                    disabled={stashForm.clear_reserved_until}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>

              {/* Button Bar */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={resetStashForm}
                  className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStash}
                  className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-md"
                >
                  {selectedStash ? "Update Stash" : "Create Stash"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Postmats Table */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">Postmats Directory</h2>
          </div>
          {loading ? (
            <div className="p-10 text-center text-gray-600 font-medium animate-pulse">Loading data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Warehouse</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Stashes</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {postmats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                        No postmats found matching your criteria
                      </td>
                    </tr>
                  ) : (
                    postmats.map(pm => {
                      const pmStashes = pm.stashes || [];

                      return (
                        <PostmatRow
                          key={pm.id}
                          postmat={pm}
                          stashes={pmStashes}
                          onEditPostmat={editPostmat}
                          onDeletePostmat={deletePostmat}
                          onEditStash={editStash}
                          onDeleteStash={deleteStash}
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex gap-2 text-sm font-medium text-gray-700">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">First</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">Prev</button>
              <span className="px-4 py-1 flex items-center bg-gray-200 rounded text-gray-800">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">Next</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">Last</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}