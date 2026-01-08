"use client";

import { useState, useEffect } from "react";
import api from "@/axios/api";
import { Package, CheckCircle, Clock } from "lucide-react";

export default function PackagesListPage() {
  const [packages, setPackages] = useState([]);

  useEffect(() => {
    api.get("api/business/packages").then((res) => setPackages(res.data));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Package Tracking</h1>
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 font-medium text-gray-500">ID</th>
              <th className="p-4 font-medium text-gray-500">Receiver</th>
              <th className="p-4 font-medium text-gray-500">Date</th>
              <th className="p-4 font-medium text-gray-500">Status</th>
              <th className="p-4 font-medium text-gray-500">Payment</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {packages.map((pkg) => (
              <tr key={pkg.id} className="hover:bg-gray-50">
                <td className="p-4 font-mono text-sm">{pkg.id}</td>
                <td className="p-4 font-medium">{pkg.receiver_name}</td>
                <td className="p-4 text-gray-500">{new Date(pkg.created_at).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                    <Clock className="w-3 h-3" /> {pkg.status}
                  </span>
                </td>
                <td className="p-4">
                  {pkg.is_paid ? (
                    <span className="text-green-600 flex items-center gap-1 text-sm"><CheckCircle className="w-4 h-4" /> Paid</span>
                  ) : (
                    <span className="text-red-500 text-sm font-medium">Unpaid</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
