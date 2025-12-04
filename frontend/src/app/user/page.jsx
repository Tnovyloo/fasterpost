"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";

import axiosClient from "@/axios/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PaymentForm from "../components/PaymentForm";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

export default function UserPanel() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [retryingPayment, setRetryingPayment] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [bannerMessage, setBannerMessage] = useState("");
  const [bannerType, setBannerType] = useState(""); // "success" | "error"
  const [loadingPackageId, setLoadingPackageId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    axiosClient.get("/accounts/user/").then(res => setUser(res.data));
    axiosClient.get("/api/packages/user/").then(res => setParcels(res.data));
    
  };

  const handleRetryPayment = async (packageId) => {
    try {
      const response = await axiosClient.post(`/api/packages/payments/retry/${packageId}/`);
      setClientSecret(response.data.payment.client_secret);
      setRetryingPayment(packageId);
    } catch (error) {
      console.error("Failed to retry payment:", error);
      
      setBannerMessage("Failed to initialize payment. Please try again.");
      setBannerType("error");

      loadData();
      setTimeout(() => setBannerMessage(""), 4000);
    }
  };

  const handlePaymentSuccess = async (packageId) => {
    setRetryingPayment(null);
    setClientSecret("");
    setLoadingPackageId(packageId); // Start loading animation
  
    // Immediately update the parcel status in the UI
    setParcels(prevParcels => 
      prevParcels.map(p => 
        p.id === packageId 
          ? { ...p, payment_status: 'processing', can_retry_payment: false }
          : p
      )
    );
  
    setBannerMessage("Payment processing... Please wait for confirmation.");
    setBannerType("success");
  
    // Reload data after a delay to get server confirmation
    setTimeout(async () => {
      await loadData();
      setLoadingPackageId(null); // Stop loading animation
      setBannerMessage("Payment successful! Your package has been confirmed.");
    }, 2000);
  
    setTimeout(() => setBannerMessage(""), 5000);
  };

  const handleCancelRetry = () => {
    setRetryingPayment(null);
    setClientSecret("");
  };

  const getPaymentStatusBadge = (status) => {
    const statusStyles = {
      succeeded: "bg-green-100 text-green-800 border-green-300",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      failed: "bg-red-100 text-red-800 border-red-300",
      cancelled: "bg-gray-100 text-gray-800 border-gray-300",
      processing: "bg-blue-100 text-blue-800 border-blue-300",
    };

    const statusLabels = {
      succeeded: "✓ Paid",
      pending: "⏳ Pending Payment",
      failed: "✗ Payment Failed",
      cancelled: "Cancelled",
      processing: "Processing",
    };

    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${statusStyles[status] || statusStyles.pending}`}>
        {statusLabels[status] || status}
      </span>
    );
  };

  const getPackageStatusBadge = (status) => {
    const statusStyles = {
      created: "bg-blue-100 text-blue-800",
      waiting_for_pickup: "bg-purple-100 text-purple-800",
      in_transit: "bg-yellow-100 text-yellow-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };

    return (
      <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${statusStyles[status] || "bg-gray-100 text-gray-800"}`}>
        {status?.replace(/_/g, " ").toUpperCase() || "N/A"}
      </span>
    );
  };

  const handleOpenStash = async (packageId) => {
    setLoadingPackageId(packageId); // Start loading
    
    try {
      const response = await axiosClient.post(`/api/packages/open-stash/${packageId}/`);
      
      setBannerMessage(response.data.message || "Package placed in stash successfully!");
      setBannerType("success");
      
      await loadData(); // Reload to show updated status
      setTimeout(() => setBannerMessage(""), 12000);
    } catch (error) {
      console.error("Failed to open stash:", error);
      
      setBannerMessage(
        error.response?.data?.error || "Failed to open stash. Please try again."
      );
      setBannerType("error");
      
      setTimeout(() => setBannerMessage(""), 12000);
    } finally {
      setLoadingPackageId(null); // Stop loading
    }
  };

  const appearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#2563eb',
    },
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <Header />
      <main className="flex-1 px-6 py-10 pt-24">
        <div className="max-w-5xl mx-auto bg-white/80 rounded-2xl shadow-lg p-6">
          <h1 className="text-3xl font-bold text-blue-800 mb-6">
            Welcome, {user?.username || "User"} 👋
          </h1>

          {bannerMessage && (
            <div
              className={`mb-4 p-3 rounded-lg text-white font-medium ${
                bannerType === "success" ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {bannerMessage}
            </div>
          )}

          <h2 className="text-xl font-semibold mb-4 text-gray-700">Your packages:</h2>
          
          {parcels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg">There is no any package yet.</p>
              <p className="text-sm mt-2">Click 'Send Package' to fill the form of sending package.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {parcels.map((p) => (
                <div key={p.id} className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="font-bold text-lg text-blue-700 mb-1">
                        📦 {p.receiver_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {p.origin_postmat_name} → {p.destination_postmat_name}
                      </p>
                    </div>
                    <div className="text-right">
                      {getPaymentStatusBadge(p.payment_status)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">Size:</span>
                      <span className="ml-2 font-medium text-gray-800">{p.size}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Weight:</span>
                      <span className="ml-2 font-medium text-gray-800">{p.weight} kg</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Package Status:</span>
                      <span className="ml-2">{getPackageStatusBadge(p.latest_status)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-bold">Amount:</span>
                      <span className="ml-2 font-bold text-gray-800">
                        ${p.payment_amount || "N/A"}
                      </span>
                    </div>
                  </div>

                    <div className="mb-3">
                        <button
                          onClick={() => router.push(`user/packages/${p.id}`)}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          📋 View Details
                        </button>
                    </div>

                    {/* Show Open Stash button for succeeded payments */}
                    {p.payment_status === 'succeeded' && p.latest_status !== 'placed_in_stash' && (
                      <button
                        onClick={() => handleOpenStash(p.id)}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                      >
                        📦 Open Stash
                      </button>
                    )}

                    {/* Show confirmation when placed in stash */}
                    {p.latest_status === 'placed_in_stash' && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-green-900">
                          ✅ Package placed in stash successfully!
                        </p>
                      </div>
                    )}

                    {/* Show retry payment button for pending/failed payments */}
                    {p.can_retry_payment && retryingPayment !== p.id && (
                      <button
                        onClick={() => handleRetryPayment(p.id)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
                      >
                        {p.payment_status === 'pending' ? '💳 Complete Payment' : '🔄 Retry Payment'}
                      </button>
                    )}

                    {/* Show payment form when retrying */}
                    {retryingPayment === p.id && clientSecret && (
                      <div className="mt-4 border-t pt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-semibold text-gray-800">Complete Payment</h3>
                          <button
                            onClick={handleCancelRetry}
                            className="text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                        <Elements options={options} stripe={stripePromise}>
                          <PaymentForm 
                            onSuccess={handlePaymentSuccess}
                            packageId={p.id}
                          />
                        </Elements>
                      </div>
                    )}
                  

                  {/* <p className="text-xs text-gray-400 mt-3">
                    Created: {new Date(p.created_at).toLocaleString('pl-PL')}
                  </p> */}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}