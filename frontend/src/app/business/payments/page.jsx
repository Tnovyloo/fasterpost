"use client";

import { useState, useEffect } from "react";
import api from "@/axios/api";

export default function PaymentsPage() {
  const [packages, setPackages] = useState([]);
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    api.get("api/business/packages").then((res) => {
      // Filter only unpaid
      setPackages(res.data.filter((p) => !p.is_paid));
    });
  }, []);

  const toggleSelect = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selected.length === packages.length) {
      setSelected([]);
    } else {
      setSelected(packages.map((p) => p.id));
    }
  };

  const handlePay = () => {
    alert(`Processing payment for ${selected.length} packages...`);
    // Implement payment API call here
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Pending Payments</h1>
        <button disabled={selected.length === 0} onClick={handlePay} className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition">
          Pay Selected ({selected.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 w-10"><input type="checkbox" onChange={toggleSelectAll} checked={packages.length > 0 && selected.length === packages.length} /></th>
              <th className="p-4 font-medium text-gray-500">Package ID</th>
              <th className="p-4 font-medium text-gray-500">Receiver</th>
              <th className="p-4 font-medium text-gray-500 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {packages.map((pkg) => (
              <tr key={pkg.id} className={selected.includes(pkg.id) ? "bg-indigo-50" : ""}>
                <td className="p-4"><input type="checkbox" checked={selected.includes(pkg.id)} onChange={() => toggleSelect(pkg.id)} /></td>
                <td className="p-4 font-mono text-sm">{pkg.id}</td>
                <td className="p-4">{pkg.receiver_name}</td>
                <td className="p-4 text-right font-bold">${pkg.price || "10.00"}</td>
              </tr>
            ))}
            {packages.length === 0 && (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">No unpaid packages found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
