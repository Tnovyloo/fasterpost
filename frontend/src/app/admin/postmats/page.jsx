"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/axios/api";
import Header from "@/app/components/Header";
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

  // Form & selection
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
  };
  const [postmatForm, setPostmatForm] = useState(initialPostmatForm);

  const initialStashForm = {
    postmat: "",
    size: "medium",
    is_empty: true,
    reserved_until: "",
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
      const res = await api.get("/api/admin/warehouses/", getAuthConfig());
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
  }, [page, pageSize, search, statusFilter, warehouseFilter]);

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

  const handleStashChange = e => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === "checkbox" ? checked : value;

    if (name === "reserved_until") {
      if (value === "") {
        finalValue = null;
      } else if (value.length === 16) {
        finalValue = value + ":00";
      }
    }

    setStashForm(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : finalValue,
    }));
  };

  const resetPostmatForm = () => {
    setPostmatForm(initialPostmatForm);
    setSelectedPostmat(null);
    setMapPosition([52.2297, 21.0122]); // fallback position
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
    } catch (err) {
      alert("Error: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  const editPostmat = pm => {
    setSelectedPostmat(pm);
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
    fetchStashes();
  };

  const getStashesForPostmat = postmatId =>
    stashes.filter(s => (s.postmat?.id || s.postmat) === postmatId);

  return (
    <>
      <Header />
      <div className="p-6 max-w-7xl mx-auto space-y-8 text-black bg-white mt-16 rounded-xl">
        <h1 className="text-4xl font-bold">Postmats & Stashes Management</h1>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="input-field">
              <option value="">All Warehouses</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.city})
                </option>
              ))}
            </select>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="input-field">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Postmat Form + Map */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-6">
          <h2 className="text-xl font-semibold">
            {selectedPostmat ? "Edit Postmat" : "Create New Postmat"}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left side – Form */}
            <div className="space-y-4">
              <select name="warehouse_id" value={postmatForm.warehouse_id} onChange={handlePostmatChange} className="input-field w-full" required>
                <option value="">Select Warehouse *</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} – {w.city}
                  </option>
                ))}
              </select>

              <input name="name" placeholder="Name (max 6 chars)" maxLength={6} value={postmatForm.name} onChange={handlePostmatChange} className="input-field w-full" required />

              <select name="status" value={postmatForm.status} onChange={handlePostmatChange} className="input-field w-full">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>

              <div className="grid grid-cols-2 gap-4">
                <input placeholder="Latitude" value={postmatForm.latitude} readOnly className="input-field bg-gray-100" />
                <input placeholder="Longitude" value={postmatForm.longitude} readOnly className="input-field bg-gray-100" />
              </div>

              <input name="postal_code" placeholder="Postal Code (optional)" value={postmatForm.postal_code} onChange={handlePostmatChange} className="input-field w-full" />

              <div className="flex gap-3 pt-4">
                <button onClick={savePostmat} className="btn-primary bg-green-600">
                  {selectedPostmat ? "Update" : "Create"} Postmat
                </button>
                {selectedPostmat && <button onClick={resetPostmatForm} className="btn-secondary">Cancel</button>}
              </div>
            </div>

            {/* Right side – Map */}
            <MapPicker position={mapPosition} setPosition={setMapPosition} />
          </div>
        </div>

        {/* Stash Form (same as before) */}
        {showStashForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-semibold mb-4">{selectedStash ? "Edit Stash" : "Add New Stash"}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <select name="postmat" value={stashForm.postmat} onChange={handleStashChange} className="input-field" required>
                <option value="">Select Postmat</option>
                {postmats.map(pm => (
                  <option key={pm.id} value={pm.id}>
                    {pm.name}
                  </option>
                ))}
              </select>
              <select name="size" value={stashForm.size} onChange={handleStashChange} className="input-field">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="is_empty" checked={stashForm.is_empty} onChange={handleStashChange} />
                <span>Is Empty</span>
              </label>
              <input type="datetime-local" name="reserved_until" value={stashForm.reserved_until} onChange={handleStashChange} className="input-field" />
            </div>
            <div className="flex gap-3">
              <button onClick={saveStash} className="btn-primary bg-blue-600">
                {selectedStash ? "Update" : "Create"} Stash
              </button>
              <button onClick={resetStashForm} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}

        {!showStashForm && (
          <button onClick={() => setShowStashForm(true)} className="btn-primary bg-indigo-600">
            + Add New Stash
          </button>
        )}

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
                    <tr><td colSpan={6} className="px-6 py-12 text-center">No postmats found</td></tr>
                  ) : (
                    postmats.map(pm => {
                      const pmStashes = getStashesForPostmat(pm.id);
                      return (
                        <tr key={pm.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium">{pm.name}</td>
                          <td className="px-6 py-4">{pm.warehouse?.city || pm.warehouse_id}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              pm.status === "active" ? "bg-green-100 text-green-800" :
                              pm.status === "inactive" ? "bg-red-100 text-red-800" :
                              "bg-yellow-100 text-yellow-800"
                            }`}>
                              {pm.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {pm.latitude.toFixed(4)}, {pm.longitude.toFixed(4)}
                            {pm.postal_code && ` (${pm.postal_code})`}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            {pmStashes.length} stashes
                          </td>
                          <td className="px-6 py-4 space-x-3">
                            <button onClick={() => editPostmat(pm)} className="text-blue-600 hover:text-blue-800">Edit</button>
                            <button onClick={() => deletePostmat(pm.id)} className="text-red-600 hover:text-red-800">Delete</button>
                          </td>
                        </tr>
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