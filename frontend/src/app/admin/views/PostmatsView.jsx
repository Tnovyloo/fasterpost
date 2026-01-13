"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/axios/api";
import PostmatRow from "@/app/components/PostmatRow";
import { ArrowLeft } from "lucide-react"; // Import Arrow
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `http://localhost:8000${path}`;
};

function LocationMarker({ position, setPosition }) {
  const map = useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position ? <Marker position={position} /> : null;
}

export default function PostmatsView({ goBack }) { // Receive goBack prop
  const API_BASE_POSTMAT = "api/admin/postmats";
  const API_BASE_STASH = "api/admin/stashes";

  const [postmats, setPostmats] = useState([]);
  const [stashes, setStashes] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("name");

  const [showPostmatForm, setShowPostmatForm] = useState(false);
  const [selectedPostmat, setSelectedPostmat] = useState(null);
  const [showStashForm, setShowStashForm] = useState(false);
  const [selectedStash, setSelectedStash] = useState(null);
  const [mapPosition, setMapPosition] = useState([52.2297, 21.0122]);
  const [isMapMounted, setIsMapMounted] = useState(false);

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
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const initialStashForm = {
    postmat: "",
    size: "medium",
    is_empty: true,
    reserved_until: null,
    clear_reserved_until: false
  };
  const [stashForm, setStashForm] = useState(initialStashForm);

  const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  const getAuthConfig = (isMultipart = false) => {
    const token = getToken();
    const headers = { Authorization: `Token ${token}` };
    if (isMultipart) {
      headers["Content-Type"] = "multipart/form-data";
    }
    return { headers };
  };

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await api.get("/api/admin/warehouses/simple", getAuthConfig());
      setWarehouses(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const L = (await import("leaflet")).default;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setIsMapMounted(true);
    })();
  }, []);

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

  useEffect(() => {
    setPostmatForm(prev => ({
      ...prev,
      latitude: mapPosition[0].toString(),
      longitude: mapPosition[1].toString(),
    }));
  }, [mapPosition]);

  const handlePostmatChange = e => {
    const { name, value } = e.target;
    setPostmatForm(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
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
    setImageFile(null);
    setImagePreview(null);
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

    const formData = new FormData();
    formData.append("warehouse_id", postmatForm.warehouse_id);
    formData.append("name", postmatForm.name);
    formData.append("status", postmatForm.status);
    formData.append("latitude", postmatForm.latitude);
    formData.append("longitude", postmatForm.longitude);
    if (postmatForm.postal_code) formData.append("postal_code", postmatForm.postal_code);
    
    if (imageFile) {
      formData.append("image", imageFile);
    }

    try {
      if (selectedPostmat) {
        await api.put(`${API_BASE_POSTMAT}/${selectedPostmat.id}/`, formData, getAuthConfig(true));
      } else {
        await api.post(API_BASE_POSTMAT + "/", formData, getAuthConfig(true));
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
    
    setImagePreview(pm.image ? getImageUrl(pm.image) : null);
    setImageFile(null);

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
    <div className="space-y-8">
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 flex items-center gap-4">
          <button 
                onClick={goBack}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition"
                title="Back to Dashboard"
          >
                <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Postmats & Stashes</h1>
            <p className="text-gray-600 mt-2 font-medium">Manage final delivery points</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-800">Filters & Sorting</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900">
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
            <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900">
              <option value="">All Warehouses</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} – {w.city}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900">
              <option value="name">Name (A → Z)</option>
              <option value="-name">Name (Z → A)</option>
              <option value="status">Status</option>
            </select>
            <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900">
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 cursor-pointer flex justify-between" onClick={() => setShowPostmatForm(prev => !prev)}>
            <h2 className="text-xl font-bold text-gray-800">{selectedPostmat ? "Edit Postmat" : "Create New Postmat"}</h2>
            <span className="text-sm font-medium text-gray-600">{showPostmatForm ? "▼" : "▶"}</span>
          </div>

          {showPostmatForm && (
            <div className="p-6 space-y-6 bg-white">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Warehouse *</label>
                    <select name="warehouse_id" value={postmatForm.warehouse_id} onChange={handlePostmatChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" required>
                      <option value="">Select Warehouse</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} – {w.city}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Name *</label>
                    <input name="name" maxLength={6} value={postmatForm.name} onChange={handlePostmatChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                    <select name="status" value={postmatForm.status} onChange={handlePostmatChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input value={postmatForm.latitude} readOnly className="w-full px-4 py-2 border bg-gray-100 text-gray-600" />
                    <input value={postmatForm.longitude} readOnly className="w-full px-4 py-2 border bg-gray-100 text-gray-600" />
                  </div>
                  <input name="postal_code" value={postmatForm.postal_code} onChange={handlePostmatChange} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900" placeholder="Postal Code" />
                  
                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Image</label>
                    <div className="flex items-center gap-4">
                        <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm text-sm font-medium text-gray-700">
                            Choose File
                            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                        </label>
                        <span className="text-xs text-gray-500">{imageFile ? imageFile.name : "No new file selected"}</span>
                    </div>
                    {imagePreview && (
                        <div className="mt-3 relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Location</label>
                  <div className="h-96 w-full rounded-lg overflow-hidden border border-gray-300 relative z-0">
                    {isMapMounted ? (
                      <MapContainer center={mapPosition} zoom={13} style={{ height: "100%", width: "100%" }}>
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationMarker position={mapPosition} setPosition={setMapPosition} />
                      </MapContainer>
                    ) : (
                      <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-500">Loading Map...</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button onClick={resetPostmatForm} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition shadow-sm">Cancel</button>
                <button onClick={savePostmat} className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition shadow-md">{selectedPostmat ? "Update" : "Create"}</button>
              </div>
            </div>
          )}
        </div>

        {/* Stash Form (Collapsible) */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mt-8">
           <div className="px-6 py-4 bg-gray-50 hover:bg-gray-100 border-b border-gray-200 cursor-pointer flex justify-between" onClick={() => setShowStashForm(prev => !prev)}>
            <h2 className="text-xl font-bold text-gray-800">{selectedStash ? "Edit Stash" : "Add Stash"}</h2>
            <span className="text-sm font-medium text-gray-600">{showStashForm ? "▼" : "▶"}</span>
           </div>
           {showStashForm && (
            <div className="p-6 bg-white">
               {/* Stash Fields */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                 <select name="postmat" value={stashForm.postmat} onChange={handleStashChange} className="w-full px-4 py-2 border rounded-lg text-gray-900" required>
                    <option value="">Select Postmat</option>
                    {postmats.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
                 </select>
                 <select name="size" value={stashForm.size} onChange={handleStashChange} className="w-full px-4 py-2 border rounded-lg text-gray-900">
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                 </select>
                 <label className="flex items-center gap-3 cursor-pointer p-2 border rounded-lg bg-gray-50">
                    <input type="checkbox" name="clear_reserved_until" checked={stashForm.clear_reserved_until || false} onChange={handleStashChange} className="w-5 h-5 text-red-600 rounded" />
                    <span className="text-sm font-bold text-red-700">Clear Reservation</span>
                 </label>
                 <input type="datetime-local" name="reserved_until" value={stashForm.clear_reserved_until ? "" : (stashForm.reserved_until?.slice(0, 16) || "")} onChange={handleStashChange} disabled={stashForm.clear_reserved_until} className="w-full px-4 py-2 border rounded-lg text-gray-900 disabled:bg-gray-100" />
               </div>
               <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                 <button onClick={resetStashForm} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50">Cancel</button>
                 <button onClick={saveStash} className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Save Stash</button>
               </div>
            </div>
           )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xl font-bold text-gray-800">Directory</h2>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Warehouse</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Stashes</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {postmats.map(pm => (
                    <PostmatRow
                      key={pm.id}
                      postmat={pm}
                      stashes={pm.stashes || []}
                      onEditPostmat={editPostmat}
                      onDeletePostmat={deletePostmat}
                      onEditStash={editStash}
                      onDeleteStash={deleteStash}
                    />
                  ))}
                </tbody>
              </table>
          </div>
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
             {/* Pagination Controls */}
             <div className="flex gap-2">
                <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 bg-white border rounded disabled:opacity-50">First</button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-white border rounded disabled:opacity-50">Prev</button>
                <span className="px-4 py-1 text-sm font-bold text-gray-700">Page {page} of {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1 bg-white border rounded disabled:opacity-50">Next</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-3 py-1 bg-white border rounded disabled:opacity-50">Last</button>
             </div>
          </div>
        </div>
    </div>
  );
}