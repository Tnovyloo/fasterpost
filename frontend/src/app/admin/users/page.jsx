"use client";

import { useState, useEffect, useMemo } from "react";
import api from "@/axios/api";
import Header from "@/app/components/Header";

export default function AdminAccountsPage() {
  // STATE
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
      // Validate passwords match if provided
      if (form.password && form.password !== form.confirm_password) {
        alert("Passwords do not match!");
        return;
      }

      // Prepare data to send
      const dataToSend = { ...form };
      
      // If password is blank or whitespace-only, remove it completely
      if (!dataToSend.password || dataToSend.password.trim() === "") {
        delete dataToSend.password;
      }

      if (selected) {
        await api.put(`/api/admin/accounts/${selected.id}/`, dataToSend);
      } else {
        // Password is required for new users
        if (!dataToSend.password) {
          alert("Password is required when creating a new user");
          return;
        }
        await api.post("/api/admin/accounts/", dataToSend);
      }
      
      resetForm();
      
      // Refresh the list
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
      password: "", // Don't pre-fill password
      confirm_password: "", // Don't pre-fill password
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8 pt-24 text-black">
      <Header />
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold">Admin Accounts</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Create Account
          </button>
        </div>

        {/* FILTERS */}
        <div className="bg-white rounded-lg shadow p-6 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                      <td className="px-6 py-4 text-sm capitalize">{acc.role}</td>
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
                      <td className="px-6 py-4 text-sm space-x-2">
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
              <button
                onClick={() => goToPage(1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong>
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span>Go to</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={page}
                onChange={(e) => goToPage(Number(e.target.value))}
                className="w-16 px-2 py-1 border rounded text-center"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CREATE/EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">
                {selected ? "Edit Account" : "Create Account"}
              </h2>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                name="email"
                value={form.email}
                placeholder="Email"
                onChange={handleInputChange}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                name="username"
                value={form.username}
                placeholder="Username"
                onChange={handleInputChange}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                name="first_name"
                value={form.first_name}
                placeholder="First Name"
                onChange={handleInputChange}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                name="last_name"
                value={form.last_name}
                placeholder="Last Name"
                onChange={handleInputChange}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                name="phone_number"
                value={form.phone_number}
                placeholder="Phone Number"
                onChange={handleInputChange}
                className="px-4 py-2 border rounded-lg"
              />
              <select
                name="role"
                value={form.role}
                onChange={handleInputChange}
                className="px-4 py-2 border rounded-lg"
              >
                <option value="normal">Normal User</option>
                <option value="courier">Courier</option>
                <option value="warehouse">Warehouse</option>
                <option value="business">Business</option>
              </select>
              
              {/* Password fields */}
              <input
                type="password"
                name="password"
                value={form.password}
                placeholder={selected ? "New Password (leave blank to keep current)" : "Password"}
                onChange={handleInputChange}
                className="px-4 py-2 border rounded-lg"
              />
              <input
                type="password"
                name="confirm_password"
                value={form.confirm_password}
                placeholder="Confirm Password"
                onChange={handleInputChange}
                className="px-4 py-2 border rounded-lg"
              />
            </div>

            {selected && (
              <p className="text-sm text-gray-600 mb-4">
                💡 Leave password fields blank to keep the current password
              </p>
            )}

            <div className="flex flex-wrap gap-6 mb-6">
              {["is_active", "is_staff", "is_admin", "is_superuser"].map((f) => (
                <label key={f} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name={f}
                    checked={form[f]}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="capitalize">{f.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={saveAccount}
                className={`px-6 py-2 text-white font-medium rounded-lg hover:opacity-90 transition ${
                  selected ? "bg-blue-600" : "bg-green-600"
                }`}
              >
                {selected ? "Update" : "Create"}
              </button>
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}