"use client";

import { useState, useEffect } from "react";
import { Check, X, Trash2 } from "lucide-react";
import api from "@/axios/api";

export default function BusinessRequestsView() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    try {
      const response = await api.get("/api/business/admin/requests");
      const data = response.data;

      if (Array.isArray(data)) {
        setRequests(data);
      } else if (data && Array.isArray(data.results)) {
        setRequests(data.results);
      } else {
        setRequests([]);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (id, action) => {
    if (action === "delete" && !confirm("Are you sure you want to delete this request?")) return;

    try {
      await api.post(`/api/business/admin/requests/${id}/action`, { action });
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.error || err.message || "Action failed");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Business Requests</h2>

      {loading ? (
        <p>Loading requests...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : !Array.isArray(requests) || requests.length === 0 ? (
        <p className="text-gray-500">No pending business requests found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 text-sm">
                <th className="pb-3 font-medium">Company</th>
                <th className="pb-3 font-medium">Tax ID</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => (
                <tr key={req.id} className="group hover:bg-gray-50">
                  <td className="py-4 font-medium text-gray-800">{req.company_name}</td>
                  <td className="py-4 text-gray-600">{req.tax_id}</td>
                  <td className="py-4 text-gray-600">{new Date(req.created_at).toLocaleDateString()}</td>
                  <td className="py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${req.status === "APPROVED" ? "bg-green-100 text-green-700" : req.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>{req.status}</span>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {req.status === "PENDING" && (
                        <>
                          <button onClick={() => handleAction(req.id, "approve")} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition" title="Approve">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleAction(req.id, "reject")} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition" title="Reject">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button onClick={() => handleAction(req.id, "delete")} className="p-2 bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}