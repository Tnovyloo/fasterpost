"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosClient from "@/axios/api";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";

export default function PackageDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackageDetails();
  }, []);

  const loadPackageDetails = async () => {
    try {
      const response = await axiosClient.get(`/api/packages/details/${params.id}/`);
      setPackageData(response.data);
    } catch (error) {
      console.error("Failed to load package details:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      created: "bg-blue-100 text-blue-800",
      placed_in_stash: "bg-purple-100 text-purple-800",
      in_transit: "bg-yellow-100 text-yellow-800",
      in_warehouse: "bg-orange-100 text-orange-800",
      delivered: "bg-green-100 text-green-800",
      picked_up: "bg-teal-100 text-teal-800",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[status] || "bg-gray-100 text-gray-800"}`}>
        {status?.replace(/_/g, " ").toUpperCase()}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const statusStyles = {
      succeeded: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      failed: "bg-red-100 text-red-800",
      processing: "bg-blue-100 text-blue-800",
      refunded: "bg-gray-100 text-gray-800",
      cancelled: "bg-gray-100 text-gray-800",
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusStyles[status] || "bg-gray-100 text-gray-800"}`}>
        {status?.toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="animate-spin h-12 w-12 text-blue-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">Loading package details...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-gray-600 mb-4">Package not found</p>
            <button
              onClick={() => router.push("/user")}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Back to Packages
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <Header />
      <main className="flex-1 px-6 py-10 pt-24">
        <div className="max-w-6xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => router.push("/user")}
            className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Packages
          </button>

          {/* Header */}
          <div className="bg-white/80 rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-blue-800 mb-2">
                  📦 Package Details
                </h1>
                <p className="text-gray-600">Package ID: {packageData.id}</p>
              </div>
              <div className="text-right">
                {getStatusBadge(packageData.latest_status)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Package Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Package Information */}
              <div className="bg-white/80 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  📋 Package Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Size</p>
                    <p className="font-semibold text-gray-800">{packageData.size.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Weight</p>
                    <p className="font-semibold text-gray-800">{packageData.weight} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sender</p>
                    <p className="font-semibold text-gray-800">{packageData.sender_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Receiver</p>
                    <p className="font-semibold text-gray-800">{packageData.receiver_name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Receiver Phone</p>
                    <p className="font-semibold text-gray-800">{packageData.receiver_phone}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Receiver Email</p>
                    <p className="font-semibold text-gray-800">{packageData.receiver_email}</p>
                  </div>
                </div>

                {/* Codes */}
                {(packageData.pickup_code || packageData.unlock_code) && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-3">🔐 Access Codes</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {packageData.pickup_code && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-600 mb-1">Pickup Code</p>
                          <p className="font-mono text-lg font-bold text-blue-900">{packageData.pickup_code}</p>
                        </div>
                      )}
                      {packageData.unlock_code && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-xs text-green-600 mb-1">Unlock Code</p>
                          <p className="font-mono text-lg font-bold text-green-900">{packageData.unlock_code}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Route Information */}
              <div className="bg-white/80 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  🗺️ Route Information
                </h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold">📍</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Origin</p>
                      <p className="font-semibold text-gray-800">{packageData.origin_postmat_name}</p>
                      <p className="text-sm text-gray-600">{packageData.origin_postmat_address}</p>
                    </div>
                  </div>
                  
                  <div className="ml-4 border-l-2 border-dashed border-gray-300 h-8"></div>
                  
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold">📍</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Destination</p>
                      <p className="font-semibold text-gray-800">{packageData.destination_postmat_name}</p>
                      <p className="text-sm text-gray-600">{packageData.destination_postmat_address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tracking History */}
              <div className="bg-white/80 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                  📍 Tracking History
                </h2>
                {packageData.actualizations && packageData.actualizations.length > 0 ? (
                  <div className="space-y-4">
                    {packageData.actualizations.map((act, index) => (
                      <div key={act.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-blue-600' : 'bg-gray-300'
                          }`}>
                            <span className="text-white font-bold text-sm">{index + 1}</span>
                          </div>
                          {index < packageData.actualizations.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-300 my-1 flex-1"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-6">
                          <div className="flex justify-between items-start mb-2">
                            {getStatusBadge(act.status)}
                            <span className="text-xs text-gray-500">
                              {new Date(act.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {act.courier_name && (
                            <p className="text-sm text-gray-600">Courier: {act.courier_name}</p>
                          )}
                          {act.warehouse_name && (
                            <p className="text-sm text-gray-600">Warehouse: {act.warehouse_name}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No tracking history available</p>
                )}
              </div>
            </div>

            {/* Right Column - Payment Info */}
            <div className="space-y-6">
              {packageData.payment && (
                <div className="bg-white/80 rounded-xl shadow-lg p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    💳 Payment Information
                  </h2>
                  
                  <div className="mb-4">
                    {getPaymentStatusBadge(packageData.payment.status)}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Base Price</span>
                      <span className="font-semibold">${packageData.payment.base_price}</span>
                    </div>
                    {packageData.payment.size_surcharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Size Surcharge</span>
                        <span className="font-semibold">${packageData.payment.size_surcharge}</span>
                      </div>
                    )}
                    {packageData.payment.weight_surcharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Weight Surcharge</span>
                        <span className="font-semibold">${packageData.payment.weight_surcharge}</span>
                      </div>
                    )}
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between">
                        <span className="text-gray-800 font-bold">Total Amount</span>
                        <span className="text-xl font-bold text-blue-600">
                          ${packageData.payment.amount}
                        </span>
                      </div>
                    </div>
                  </div>

                  {packageData.payment.paid_at && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500">Paid on</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(packageData.payment.paid_at).toLocaleString('en-US')}
                      </p>
                    </div>
                  )}

                  {packageData.payment.payment_method && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500">Payment Method</p>
                      <p className="text-sm font-semibold text-gray-800">
                        {packageData.payment.payment_method}
                      </p>
                    </div>
                  )}

                  {packageData.payment.failure_reason && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-xs text-red-600 mb-1">Failure Reason</p>
                      <p className="text-sm text-red-800">{packageData.payment.failure_reason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}