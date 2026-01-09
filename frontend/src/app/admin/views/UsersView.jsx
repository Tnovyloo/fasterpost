"use client";

import { useState, useEffect, useMemo } from "react";
import api from "@/axios/api";
import { ArrowLeft } from "lucide-react"; // Import Arrow

// --- ICONS ---
const ActivityIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
);

const TruckIcon = () => (
  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);

export default function AdminAccountsPage({ goBack }) { // Receive goBack prop
  // STATE
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ACTIVITY MODAL STATE
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [courierRoutes, setCourierRoutes] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  // FILTERS, SORTING, PAGINATION
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [sortField, setSortField] = useState("date_joined");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // FORM STATE
  const initialForm = {
    email: "",
    username: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    role: "normal",
    is_active: true,
    is_staff: false,
    is_admin: false,
    is_superuser: false,
    password: "",
    confirm_password: "",
  };
  const [form, setForm] = useState(initialForm);

  // FETCH DATA
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/admin/accounts/");
        setAccounts(res.data.results || res.data || []);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load accounts");
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  // FILTERED + SORTED + PAGINATED DATA
  const filteredAccounts = useMemo(() => {
    let data = [...accounts];

    // SEARCH FILTER
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(
        (a) =>
          a.email.toLowerCase().includes(s) ||
          a.username.toLowerCase().includes(s)
      );
    }

    // ROLE FILTER
    if (roleFilter) {
      data = data.filter((a) => a.role === roleFilter);
    }

    // SORT
    data.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      return 0;
    });

    return data;
  }, [accounts, search, roleFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filteredAccounts.length / pageSize);
  const paginatedAccounts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAccounts.slice(start, start + pageSize);
  }, [filteredAccounts, page, pageSize]);

  // HANDLERS
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelected(null);
    setShowModal(false);
  };

  const saveAccount = async () => {
    try {
      if (form.password && form.password !== form.confirm_password) {
        alert("Passwords do not match!");
        return;
      }
      const dataToSend = { ...form };
      if (!dataToSend.password || dataToSend.password.trim() === "") {
        delete dataToSend.password;
      }

      if (selected) {
        await api.put(`/api/admin/accounts/${selected.id}/`, dataToSend);
      } else {
        if (!dataToSend.password) {
          alert("Password is required when creating a new user");
          return;
        }
        await api.post("/api/admin/accounts/", dataToSend);
      }
      
      resetForm();
      const res = await api.get("/api/admin/accounts/");
      setAccounts(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data 
        ? JSON.stringify(err.response.data, null, 2)
        : err.message;
      alert(`Failed to save account:\n${errorMsg}`);
    }
  };

  const editAccount = (account) => {
    setSelected(account);
    setForm({
      email: account.email || "",
      username: account.username || "",
      first_name: account.first_name || "",
      last_name: account.last_name || "",
      phone_number: account.phone_number || "",
      role: account.role || "normal",
      is_active: !!account.is_active,
      is_staff: !!account.is_staff,
      is_admin: !!account.is_admin,
      is_superuser: !!account.is_superuser,
      password: "", 
      confirm_password: "", 
    });
    setShowModal(true);
  };

  const deleteAccount = async (id) => {
    if (!window.confirm("Delete this account?")) return;
    try {
      await api.delete(`/api/admin/accounts/${id}/`);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete account");
    }
  };

  // --- NEW: VIEW ACTIVITY ---
  const viewActivity = async (account) => {
    setSelectedCourier(account);
    setShowActivityModal(true);
    setLoadingActivity(true);
    try {
        const res = await api.get(`/api/admin/routes/?courier=${account.id}`);
        const routes = res.data.results || res.data || [];
        
        const filtered = routes.filter(r => r.courier === account.id || r.courier?.id === account.id);
        
        setCourierRoutes(filtered);
    } catch (err) {
        console.error("Fetch routes error", err);
        alert("Failed to load activity log.");
    } finally {
        setLoadingActivity(false);
    }
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const goToPage = (p) => {
    const newPage = Math.max(1, Math.min(p, totalPages));
    setPage(newPage);
  };

  // Organize routes for modal
  const activeRoute = courierRoutes.find(r => r.status === 'in_progress');
  const plannedRoutes = courierRoutes.filter(r => r.status === 'planned');
  const pastRoutes = courierRoutes.filter(r => ['completed', 'cancelled'].includes(r.status));

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
                onClick={goBack}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900 transition"
                title="Back to Dashboard"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-4xl font-bold">Admin Accounts</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Create Account
          </button>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 border border-gray-100">
          <input
            type="text"
            placeholder="Search by email or username..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value="normal">Normal User</option>
            <option value="courier">Courier</option>
            <option value="warehouse">Warehouse</option>
            <option value="business">Business</option>
          </select>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {[
                    { key: "email", label: "Email" },
                    { key: "username", label: "Username" },
                    { key: "role", label: "Role" },
                    { key: "is_active", label: "Active" },
                    { key: "is_staff", label: "Staff" },
                    { key: "is_admin", label: "Admin" },
                    { key: "date_joined", label: "Joined" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    >
                      {col.label}{" "}
                      {sortField === col.key && (
                        <span>{sortDir === "asc" ? "↑" : "↓"}</span>
                      )}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      No accounts found
                    </td>
                  </tr>
                ) : (
                  paginatedAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-sm text-blue-600">
                        {acc.email}
                      </td>
                      <td className="px-6 py-4 text-sm">{acc.username}</td>
                      <td className="px-6 py-4 text-sm capitalize">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                            acc.role === 'courier' ? 'bg-orange-100 text-orange-800' : 
                            acc.role === 'warehouse' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'
                        }`}>
                            {acc.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {acc.is_active ? "Yes" : "No"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {acc.is_staff ? "Yes" : "No"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {acc.is_admin ? "Yes" : "No"}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(acc.date_joined).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                            {/* ACTIVITY BUTTON - Only for Logistics Roles */}
                            {['courier', 'warehouse'].includes(acc.role) && (
                                <button
                                    onClick={() => viewActivity(acc)}
                                    className="p-1.5 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 transition"
                                    title="View Route Activity"
                                >
                                    <ActivityIcon />
                                </button>
                            )}
                            <button
                                onClick={() => editAccount(acc)}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Edit
                            </button>
                            <button
                                onClick={() => deleteAccount(acc.id)}
                                className="text-red-600 hover:text-red-800 font-medium"
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

          {/* PAGINATION */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => goToPage(1)} disabled={page === 1} className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">First</button>
              <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">Previous</button>
              <span className="px-4">Page <strong>{page}</strong> of <strong>{totalPages}</strong></span>
              <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">Next</button>
              <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">Last</button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Go to</span>
              <input type="number" min="1" max={totalPages} value={page} onChange={(e) => goToPage(Number(e.target.value))} className="w-16 px-2 py-1 border rounded text-center" />
            </div>
          </div>
        </div>

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">{selected ? "Edit Account" : "Create Account"}</h2>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>
            {/* Form Fields ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input name="email" value={form.email} placeholder="Email" onChange={handleInputChange} className="px-4 py-2 border rounded-lg" />
              <input name="username" value={form.username} placeholder="Username" onChange={handleInputChange} className="px-4 py-2 border rounded-lg" />
              <input name="first_name" value={form.first_name} placeholder="First Name" onChange={handleInputChange} className="px-4 py-2 border rounded-lg" />
              <input name="last_name" value={form.last_name} placeholder="Last Name" onChange={handleInputChange} className="px-4 py-2 border rounded-lg" />
              <input name="phone_number" value={form.phone_number} placeholder="Phone Number" onChange={handleInputChange} className="px-4 py-2 border rounded-lg" />
              <select name="role" value={form.role} onChange={handleInputChange} className="px-4 py-2 border rounded-lg">
                <option value="normal">Normal User</option>
                <option value="courier">Courier</option>
                <option value="warehouse">Warehouse</option>
                <option value="business">Business</option>
              </select>
              <input type="password" name="password" value={form.password} placeholder={selected ? "New Password (optional)" : "Password"} onChange={handleInputChange} className="px-4 py-2 border rounded-lg" />
              <input type="password" name="confirm_password" value={form.confirm_password} placeholder="Confirm Password" onChange={handleInputChange} className="px-4 py-2 border rounded-lg" />
            </div>
            <div className="flex flex-wrap gap-6 mb-6">
              {["is_active", "is_staff", "is_admin", "is_superuser"].map((f) => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" name={f} checked={form[f]} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                  <span className="capitalize">{f.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={saveAccount} className={`px-6 py-2 text-white font-medium rounded-lg hover:opacity-90 transition ${selected ? "bg-blue-600" : "bg-green-600"}`}>{selected ? "Update" : "Create"}</button>
              <button onClick={resetForm} className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVITY MODAL */}
      {showActivityModal && selectedCourier && (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b bg-gray-50 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                           <TruckIcon /> 
                           Activity Log: {selectedCourier.username}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">{selectedCourier.email} • {selectedCourier.role.toUpperCase()}</p>
                    </div>
                    <button onClick={() => setShowActivityModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-8">
                    {loadingActivity ? (
                        <div className="text-center py-10 text-gray-500">Loading activity data...</div>
                    ) : (
                        <>
                            {/* 1. Active Route */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Current Status</h3>
                                {activeRoute ? (
                                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 animate-pulse-slow">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="bg-indigo-600 text-white px-2 py-0.5 rounded text-xs font-bold">IN PROGRESS</span>
                                            <span className="text-sm text-indigo-800 font-mono">{activeRoute.scheduled_date}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-gray-500 text-xs">Total Stops</p>
                                                <p className="font-bold text-gray-800">{activeRoute.stops.length}</p>
                                            </div>
                                            <div>
                                                <p className="text-gray-500 text-xs">Distance</p>
                                                <p className="font-bold text-gray-800">{activeRoute.total_distance} km</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-gray-500 italic">
                                        No active route currently. Driver is idle.
                                    </div>
                                )}
                            </div>

                            {/* 2. Upcoming Routes */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Scheduled Work</h3>
                                {plannedRoutes.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">No upcoming routes assigned.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {plannedRoutes.map(r => (
                                            <div key={r.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 flex justify-between items-center">
                                                <div>
                                                    <span className="font-bold text-gray-800">{r.scheduled_date}</span>
                                                    <span className="mx-2 text-gray-300">|</span>
                                                    <span className="text-sm text-gray-600">{r.stops.length} Stops</span>
                                                </div>
                                                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">PLANNED</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* 3. History */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Recent History</h3>
                                {pastRoutes.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">No history available.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {pastRoutes.slice(0, 5).map(r => (
                                            <div key={r.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center opacity-75">
                                                <div>
                                                    <span className="font-medium text-gray-700">{r.scheduled_date}</span>
                                                    <span className="mx-2 text-gray-300">|</span>
                                                    <span className="text-sm text-gray-500">{r.total_distance} km</span>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded font-medium ${r.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {r.status.toUpperCase()}
                                                </span>
                                            </div>
                                        ))}
                                        {pastRoutes.length > 5 && (
                                            <p className="text-xs text-center text-gray-400 mt-2">...and {pastRoutes.length - 5} more</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <button onClick={() => setShowActivityModal(false)} className="px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-100 text-sm font-medium">
                        Close
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
}