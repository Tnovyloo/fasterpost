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
      <div className="h-96 rounded-lg border bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading map...</p>
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
        reserved_until: checked ? null : prev.reserved_until  // ← ONLY THIS LINE MATTERS
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

  const getStashesForPostmat = postmatId =>
    stashes.filter(s => (s.postmat?.id || s.postmat) === postmatId);

  return (
    <>
      <Header />
      <div className="p-6 max-w-7xl mx-auto space-y-8 text-black bg-white mt-16 rounded-xl">
        <h1 className="text-4xl font-bold">Postmats & Stashes Management</h1>

        {/* Filters + Sorting */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Filters & Sorting</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search by name or postal code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* Status Filter */}
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>

            {/* Warehouse Filter */}
            <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="input-field">
              <option value="">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.city})
                </option>
              ))}
            </select>

            {/* Sorting Dropdown */}
            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)} 
              className="input-field font-medium"
            >
              <option value="">Default Sort</option>
              <option value="name">Name (A → Z)</option>
              <option value="-name">Name (Z → A)</option>
              <option value="status">Status</option>
              <option value="-status">Status (desc)</option>
            </select>

            {/* Page Size */}
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="input-field">
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
        </div>

        {/* Postmat Form – Collapsible Card */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div 
            className="px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white cursor-pointer flex items-center justify-between"
            onClick={() => setShowPostmatForm(prev => !prev)}
          >
            <h2 className="text-xl font-semibold flex items-center gap-3">
              <span className="text-2xl">{showPostmatForm ? "▼" : "▶"}</span>
              {selectedPostmat ? "Edit Postmat" : "Create New Postmat"}
            </h2>
            <span className="text-sm opacity-90">
              {showPostmatForm ? (selectedPostmat ? `Editing: ${selectedPostmat.name}` : 'Creating: New postmat') : "Click to expand"}
            </span>
          </div>

          {showPostmatForm && (
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left – Form */}
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse *</label>
                    <select
                      name="warehouse_id"
                      value={postmatForm.warehouse_id}
                      onChange={handlePostmatChange}
                      className="input-field w-full"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Name (max 6 chars) *</label>
                    <input
                      name="name"
                      maxLength={6}
                      value={postmatForm.name}
                      onChange={handlePostmatChange}
                      className="input-field w-full"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select name="status" value={postmatForm.status} onChange={handlePostmatChange} className="input-field w-full">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                      <input value={postmatForm.latitude} readOnly className="input-field bg-gray-50" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                      <input value={postmatForm.longitude} readOnly className="input-field bg-gray-50" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code (optional)</label>
                    <input
                      name="postal_code"
                      value={postmatForm.postal_code}
                      onChange={handlePostmatChange}
                      className="input-field w-full"
                      placeholder="e.g. 00-000"
                    />
                  </div>
                </div>

                {/* Right – Map */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Click map to set location</label>
                  <MapPicker position={mapPosition} setPosition={setMapPosition} />
                </div>
              </div>

              {/* Button Bar – Fixed at bottom */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 -mx-6 px-6 pb-2 bg-gray-50">
                <button
                  onClick={resetPostmatForm}
                  className="px-6 py-2.5 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={savePostmat}
                  className="px-8 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition shadow-md"
                >
                  {selectedPostmat ? "Update Postmat" : "Create Postmat"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stash Form – Same style */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-8">
          <div 
            className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white cursor-pointer flex items-center justify-between"
            onClick={() => setShowStashForm(prev => !prev)}
          >
            <h2 className="text-xl font-semibold flex items-center gap-3">
              <span className="text-2xl">{showStashForm ? "▼" : "▶"}</span>
              {selectedStash ? "Edit Stash" : "Add New Stash"}
            </h2>
            <span className="text-sm opacity-90">
              {showStashForm ? (selectedStash ? `Editing: Stash` : 'Creating: New stash') : "Click to expand"}
            </span>
          </div>

          {showStashForm && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Postmat *</label>
                  <select name="postmat" value={stashForm.postmat} onChange={handleStashChange} className="input-field w-full" required>
                    <option value="">Select Postmat</option>
                    {postmats.map(pm => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                  <select name="size" value={stashForm.size} onChange={handleStashChange} className="input-field w-full">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="clear_reserved_until"
                      checked={stashForm.clear_reserved_until || false}
                      onChange={handleStashChange}
                      className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    />
                    <span className="text-sm font-medium text-red-600">Clear reserved until</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reserved Until (optional)
                  </label>
                  <input
                    type="datetime-local"
                    name="reserved_until"
                    value={stashForm.clear_reserved_until ? "" : (stashForm.reserved_until?.slice(0, 16) || "")}
                    onChange={handleStashChange}
                    disabled={stashForm.clear_reserved_until}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Button Bar */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 -mx-6 px-6 pb-2 bg-gray-50">
                <button
                  onClick={resetStashForm}
                  className="px-6 py-2.5 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveStash}
                  className="px-8 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition shadow-md"
                >
                  {selectedStash ? "Update Stash" : "Create Stash"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Postmats Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Postmats</h2>
          </div>
          {loading ? (
            <div className="p-10 text-center">Loading…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Warehouse</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Stashes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {postmats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        No postmats found
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
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
            <div className="flex gap-2 text-sm">
              <button onClick={() => setPage(1)} disabled={page === 1} className="btn-pagination">First</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-pagination">Prev</button>
              <span className="px-4">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-pagination">Next</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="btn-pagination">Last</button>
            </div>
          </div>
        </div>
      </div>

      {/* Tailwind helpers */}
      <style jsx>{`
        .input-field {
          @apply px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500;
        }
        .btn-primary {
          @apply px-6 py-2 text-white font-medium rounded-lg hover:opacity-90 transition;
        }
        .btn-secondary {
          @apply px-6 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition;
        }
        .btn-pagination {
          @apply px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition;
        }
      `}</style>
    </>
  );
}