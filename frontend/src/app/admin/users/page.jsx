// "use client";

// import { useEffect, useState, useCallback } from "react";
// import api from "@/axios/api"; // Your centralized Axios instance
// import Header from "@/app/components/Header";

// export default function AdminAccountsPage() {
//   const API_BASE = "/api/admin/accounts";

//   // State
//   const [accounts, setAccounts] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [selected, setSelected] = useState(null);

//   // Filters & Pagination
//   const [search, setSearch] = useState("");
//   const [roleFilter, setRoleFilter] = useState("");
//   const [sortField, setSortField] = useState("date_joined");
//   const [sortDir, setSortDir] = useState("desc");
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(10);
//   const [totalPages, setTotalPages] = useState(1);

//   // Form state
//   const initialForm = {
//     email: "",
//     username: "",
//     first_name: "",
//     last_name: "",
//     phone_number: "",
//     role: "normal",
//     is_active: true,
//     is_staff: false,
//     is_admin: false,
//     is_superuser: false,
//   };
//   const [form, setForm] = useState(initialForm);

//   // Get token from localStorage (client-side only)
//   const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

//   // Axios config with auth header
//   const getAuthConfig = () => {
//     const token = getToken();
//     return token ? { headers: { Authorization: `Token ${token}` } } : {};
//   };

//   // Fetch accounts with filters
//   const fetchAccounts = useCallback(async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       const params = new URLSearchParams();
//       if (search) params.append("search", search);
//       if (roleFilter) params.append("role", roleFilter);
//       params.append("ordering", `${sortDir === "desc" ? "-" : ""}${sortField}`);
//       params.append("page", page);
//       params.append("page_size", pageSize);

//       const response = await api.get(API_BASE + "/", {
//         params,
//         ...getAuthConfig(),
//       });

//       const data = response.data;

//       if (data.results) {
//         setAccounts(data.results);
//         setTotalPages(Math.ceil((data.count || data.results.length) / pageSize) || 1);
//       } else if (Array.isArray(data)) {
//         setAccounts(data);
//         setTotalPages(1);
//       } else {
//         setAccounts([]);
//         setTotalPages(1);
//       }
//     } catch (err) {
//       console.error("Failed to fetch accounts:", err);
//       setError(err.response?.data || err.message || "Failed to load accounts");
//       setAccounts([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [page, pageSize, search, roleFilter, sortField, sortDir]);

//   // Reset page on filter change
//   useEffect(() => {
//     setPage(1);
//   }, [search, roleFilter, pageSize]);

//   // Fetch on mount and dependency change
//   useEffect(() => {
//     fetchAccounts();
//   }, [fetchAccounts]);

//   // Handlers
//   const handleInputChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setForm((prev) => ({
//       ...prev,
//       [name]: type === "checkbox" ? checked : value,
//     }));
//   };

//   const resetForm = () => {
//     setForm(initialForm);
//     setSelected(null);
//   };

//   const createAccount = async () => {
//     try {
//       await api.post(API_BASE + "/", form, getAuthConfig());
//       resetForm();
//       fetchAccounts();
//     } catch (err) {
//       alert("Create failed: " + JSON.stringify(err.response?.data || err.message));
//     }
//   };

//   const updateAccount = async () => {
//     if (!selected) return;
//     try {
//       await api.put(`${API_BASE}/${selected.id}/`, form, getAuthConfig());
//       resetForm();
//       fetchAccounts();
//     } catch (err) {
//       alert("Update failed: " + JSON.stringify(err.response?.data || err.message));
//     }
//   };

//   const patchAccount = async () => {
//     if (!selected) return;
//     try {
//       await api.patch(`${API_BASE}/${selected.id}/`, form, getAuthConfig());
//       resetForm();
//       fetchAccounts();
//     } catch (err) {
//       alert("Patch failed: " + JSON.stringify(err.response?.data || err.message));
//     }
//   };

//   const deleteAccount = async (id) => {
//     if (!window.confirm("Are you sure you want to delete this account?")) return;

//     try {
//       await api.delete(`${API_BASE}/${id}/`, getAuthConfig());
//       if (accounts.length === 1 && page > 1) {
//         setPage((p) => p - 1);
//       } else {
//         fetchAccounts();
//       }
//     } catch (err) {
//       alert("Delete failed: " + JSON.stringify(err.response?.data || err.message));
//     }
//   };

//   const editAccount = (account) => {
//     setSelected(account);
//     setForm({
//       email: account.email || "",
//       username: account.username || "",
//       first_name: account.first_name || "",
//       last_name: account.last_name || "",
//       phone_number: account.phone_number || "",
//       role: account.role || "normal",
//       is_active: !!account.is_active,
//       is_staff: !!account.is_staff,
//       is_admin: !!account.is_admin,
//       is_superuser: !!account.is_superuser,
//     });
//     window.scrollTo({ top: 0, behavior: "smooth" });
//   };

//   const toggleSort = (field) => {
//     if (sortField === field) {
//       setSortDir((d) => (d === "asc" ? "desc" : "asc"));
//     } else {
//       setSortField(field);
//       setSortDir("asc");
//     }
//   };

//   const goToPage = (p) => {
//     const newPage = Math.max(1, Math.min(p, totalPages));
//     setPage(newPage);
//   };

//   return (
//     <>
//     <Header></Header>
//     <div className="p-6 max-w-7xl mx-auto space-y-8 text-black bg-white mt-16 rounded-xl">
//       <h1 className="text-4xl font-bold text-black">Admin Accounts Management</h1>

//       {/* Filters */}
//       <div className="bg-white p-6 rounded-xl shadow-sm border">
//         <h2 className="text-xl font-semibold mb-4">Filters & View Options</h2>
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <input
//             type="text"
//             placeholder="Search by email or username..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//           <select
//             value={roleFilter}
//             onChange={(e) => setRoleFilter(e.target.value)}
//             className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="">All Roles</option>
//             <option value="normal">Normal User</option>
//             <option value="courier">Courier</option>
//             <option value="warehouse">Warehouse Courier</option>
//             <option value="business">Business User</option>
//           </select>
//           <select
//             value={pageSize}
//             onChange={(e) => setPageSize(Number(e.target.value))}
//             className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value={5}>5 per page</option>
//             <option value={10}>10 per page</option>
//             <option value={20}>20 per page</option>
//             <option value={50}>50 per page</option>
//           </select>
//         </div>
//       </div>

//       {/* Create/Edit Form */}
//       <div className="bg-white p-6 rounded-xl shadow-sm border">
//         <h2 className="text-xl font-semibold mb-4">
//           {selected ? "Edit User Account" : "Create New User"}
//         </h2>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
//           <input name="email" placeholder="Email" value={form.email} onChange={handleInputChange} className="input-field" />
//           <input name="username" placeholder="Username" value={form.username} onChange={handleInputChange} className="input-field" />
//           <input name="first_name" placeholder="First Name" value={form.first_name} onChange={handleInputChange} className="input-field" />
//           <input name="last_name" placeholder="Last Name" value={form.last_name} onChange={handleInputChange} className="input-field" />
//           <input name="phone_number" placeholder="Phone Number" value={form.phone_number} onChange={handleInputChange} className="input-field" />

//           <select name="role" value={form.role} onChange={handleInputChange} className="input-field">
//             <option value="normal">Normal User</option>
//             <option value="courier">Courier</option>
//             <option value="warehouse">Warehouse Courier</option>
//             <option value="business">Business User</option>
//           </select>
//         </div>

//         <div className="flex flex-wrap gap-6 mb-6">
//           {["is_active", "is_staff", "is_admin", "is_superuser"].map((field) => (
//             <label key={field} className="flex items-center gap-2 cursor-pointer">
//               <input
//                 type="checkbox"
//                 name={field}
//                 checked={form[field]}
//                 onChange={handleInputChange}
//                 className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
//               />
//               <span className="capitalize">{field.replace(/_/g, " ")}</span>
//             </label>
//           ))}
//         </div>

//         <div className="flex gap-3">
//           {selected ? (
//             <>
//               <button onClick={updateAccount} className="btn-primary bg-blue-600">Update (PUT)</button>
//               <button onClick={patchAccount} className="btn-primary bg-indigo-600">Partial Update (PATCH)</button>
//               <button onClick={resetForm} className="btn-secondary">Cancel</button>
//             </>
//           ) : (
//             <button onClick={createAccount} className="btn-primary bg-green-600">Create User</button>
//           )}
//         </div>
//       </div>

//       {/* Users Table */}
//       <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
//         <div className="p-6 border-b">
//           <h2 className="text-xl font-semibold">User Accounts</h2>
//         </div>

//         {loading ? (
//           <div className="p-10 text-center">Loading accounts...</div>
//         ) : error ? (
//           <div className="p-6 text-red-600 bg-red-50 border border-red-200 rounded-lg mx-6 my-4">
//             <strong>Error:</strong> {typeof error === "string" ? error : JSON.stringify(error)}
//           </div>
//         ) : (
//           <>
//             <div className="overflow-x-auto">
//               <table className="w-full">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     {[
//                       { key: "email", label: "Email" },
//                       { key: "username", label: "Username" },
//                       { key: "role", label: "Role" },
//                       { key: "is_active", label: "Active" },
//                       { key: "is_staff", label: "Staff" },
//                       { key: "is_admin", label: "Admin" },
//                       { key: "date_joined", label: "Joined" },
//                     ].map((col) => (
//                       <th
//                         key={col.key}
//                         onClick={() => toggleSort(col.key)}
//                         className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider cursor-pointer hover:bg-gray-100"
//                       >
//                         {col.label}
//                         {sortField === col.key && <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>}
//                       </th>
//                     ))}
//                     <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
//                       Actions
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {accounts.length === 0 ? (
//                     <tr>
//                       <td colSpan="8" className="px-6 py-12 text-center text-black">
//                         No users found matching your filters.
//                       </td>
//                     </tr>
//                   ) : (
//                     accounts.map((acc) => (
//                       <tr key={acc.id} className="hover:bg-gray-50">
//                         <td className="px-6 py-4 whitespace-nowrap text-sm">{acc.email}</td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm">{acc.username}</td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{acc.role}</td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm">{acc.is_active ? "Yes" : "No"}</td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm">{acc.is_staff ? "Yes" : "No"}</td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm">{acc.is_admin ? "Yes" : "No"}</td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm">
//                           {new Date(acc.date_joined).toLocaleDateString()}
//                         </td>
//                         <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
//                           <button
//                             onClick={() => editAccount(acc)}
//                             className="text-blue-600 hover:text-blue-800 font-medium"
//                           >
//                             Edit
//                           </button>
//                           <button
//                             onClick={() => deleteAccount(acc.id)}
//                             className="text-red-600 hover:text-red-800 font-medium"
//                           >
//                             Delete
//                           </button>
//                         </td>
//                       </tr>
//                     ))
//                   )}
//                 </tbody>
//               </table>
//             </div>

//             {/* Pagination */}
//             <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
//               <div className="flex items-center gap-2 text-sm">
//                 <button onClick={() => goToPage(1)} disabled={page === 1} className="btn-pagination">
//                   First
//                 </button>
//                 <button onClick={() => goToPage(page - 1)} disabled={page === 1} className="btn-pagination">
//                   Previous
//                 </button>
//                 <span className="px-4">
//                   Page <strong>{page}</strong> of <strong>{totalPages}</strong>
//                 </span>
//                 <button onClick={() => goToPage(page + 1)} disabled={page === totalPages} className="btn-pagination">
//                   Next
//                 </button>
//                 <button onClick={() => goToPage(totalPages)} disabled={page === totalPages} className="btn-pagination">
//                   Last
//                 </button>
//               </div>
//               <div className="flex items-center gap-2 text-sm">
//                 <span>Go to</span>
//                 <input
//                   type="number"
//                   min="1"
//                   max={totalPages}
//                   value={page}
//                   onChange={(e) => goToPage(Number(e.target.value))}
//                   className="w-16 px-2 py-1 border rounded text-center"
//                 />
//               </div>
//             </div>
//           </>
//         )}
//       </div>

//       {/* Tailwind helper classes */}
//       <style jsx>{`
//         .input-field {
//           @apply px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500;
//         }
//         .btn-primary {
//           @apply px-6 py-2 text-white font-medium rounded-lg hover:opacity-90 transition;
//         }
//         .btn-secondary {
//           @apply px-6 py-2 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition;
//         }
//         .btn-pagination {
//           @apply px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition;
//         }
//       `}</style>
//     </div>
//     </>
//   );
// }

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
      if (selected) {
        await api.put(`/api/admin/accounts/${selected.id}/`, form);
      } else {
        await api.post("/api/admin/accounts/", form);
      }
      resetForm();
      const res = await api.get("/api/admin/accounts/");
      setAccounts(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to save account");
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
      <Header></Header>
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
            </div>

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
