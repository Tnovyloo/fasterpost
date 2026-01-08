"use client";

import { useState, useEffect } from "react";
import Header from "@/app/components/Header";
import api from "@/axios/api";
import { CheckCircle, AlertCircle, Loader2, Building } from "lucide-react";

export default function BusinessPage() {
  const [nip, setNip] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestStatus, setRequestStatus] = useState(null);

  // Check if user already has a request on load
  useEffect(() => {
    api.get("api/business/request/")
      .then(res => setRequestStatus(res.data))
      .catch(() => setRequestStatus(null));
  }, []);

  const handleVerifyAndSubmit = async () => {
    if (nip.length < 10) return;
    setLoading(true);
    setError("");
  
    try {
      // Ensure the trailing slash is present: "business/request/"
      const res = await api.post("api/business/request/", { 
        tax_id: nip 
      });
      setRequestStatus(res.data);
    } catch (err) {
      // Handle the specific error messages from Django (e.g., "NIP in use")
      const serverMessage = err.response?.data?.error || "Failed to verify business details.";
      setError(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Header />
      <div className="max-w-xl mx-auto p-8">
        {requestStatus ? (
          <div className="bg-white rounded-3xl p-10 shadow-xl border text-center">
            <div className="inline-flex p-4 rounded-full bg-indigo-50 text-indigo-600 mb-6">
              <Building size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{requestStatus.company_name}</h2>
            <p className="text-gray-500 mb-6 font-mono">NIP: {requestStatus.tax_id}</p>
            
            <div className={`py-3 px-6 rounded-2xl inline-block font-bold text-sm ${
              requestStatus.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
              requestStatus.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              Status: {requestStatus.status}
            </div>
            
            <p className="mt-8 text-sm text-gray-500">
              {requestStatus.status === 'PENDING' && "We are currently verifying your business documents."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-10 shadow-xl border">
            <h1 className="text-3xl font-black mb-2 text-black">Business Account</h1>
            <p className="text-gray-500 mb-8">Enter your NIP. We will automatically fetch your company data from CEIDG.</p>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 ml-1 ">Polish NIP</label>
                <input 
                  type="text"
                  placeholder="e.g. 123456789"
                  value={nip}
                  onChange={(e) => setNip(e.target.value.replace(/\D/g, ""))}
                  className="w-full mt-1 p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all text-xl font-mono text-gray-400"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}

              <button 
                onClick={handleVerifyAndSubmit}
                disabled={loading || nip.length < 10}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Verify & Submit Application"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}