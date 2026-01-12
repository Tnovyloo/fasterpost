"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/axios/api";
import Header from "@/app/components/Header";

export default function BusinessPage() {
  const [role, setRole] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null); // null, 'PENDING', 'APPROVED', 'REJECTED'
  const [nip, setNip] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Check Role
        const roleRes = await api.get("/accounts/user/role/");
        const userRole = roleRes.data.role;
        setRole(userRole);

        if (userRole === "business") {
          router.push("/business/dashboard");
          return;
        }

        // 2. Check for existing request
        try {
          const reqRes = await api.get("/api/business/request/");
          if (reqRes.data && reqRes.data.status) {
            setRequestStatus(reqRes.data.status);
          }
        } catch (err) {
          // 404 means no request found, which is fine
          if (err.response?.status !== 404) {
            console.error("Failed to fetch request status", err);
          }
        }
      } catch (err) {
        console.error("Initialization failed", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post("/api/business/request/", { tax_id: nip });
      setRequestStatus("PENDING");
      alert("Application submitted successfully!");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to submit application.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto pt-32 px-6">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Business Account
          </h1>

          {requestStatus === "PENDING" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <h2 className="text-xl font-semibold text-yellow-800 mb-2">
                Application Pending
              </h2>
              <p className="text-yellow-700">
                Your request to become a business partner is currently under review.
                Please check back later.
              </p>
            </div>
          )}

          {requestStatus === "REJECTED" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Application Rejected
              </h2>
              <p className="text-red-700">
                Unfortunately, your request was rejected. Please contact support for more information.
              </p>
            </div>
          )}

          {!requestStatus && (
            <div>
              <p className="text-gray-600 mb-8">
                Upgrade your account to Business to access bulk shipping, API integrations, and warehouse management.
                Please provide your NIP (Tax ID) to verify your company details.
              </p>

              <form onSubmit={handleSubmit} className="max-w-md">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NIP (Tax Identification Number)
                  </label>
                  <input
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="e.g., 1234567890"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                    required
                  />
                </div>

                {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Submit Application"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}