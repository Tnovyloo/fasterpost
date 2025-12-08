import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import axiosClient from "@/axios/api";

const ParcelMapSendPackage = dynamic(
  () => import("./ParcelMapSendPackage"),
  { ssr: false, loading: () => <p>Loading map...</p> }
);

// Haversine formula for distance calculation
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function EditPackageModal({ package: pkg, onClose, onSuccess }) {
  const [postmats, setPostmats] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [receiverName, setReceiverName] = useState(pkg.receiver_name || "");
  const [receiverPhone, setReceiverPhone] = useState(pkg.receiver_phone || "");
  const [receiverEmail, setReceiverEmail] = useState(pkg.receiver_email || "");
  const [size, setSize] = useState(pkg.size || "small");
  const [weight, setWeight] = useState(pkg.weight || 1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [actualOrigin, setActualOrigin] = useState(null);
  const [showStashChangeWarning, setShowStashChangeWarning] = useState(false);

  useEffect(() => {
    loadPostmats();
  }, []);

  useEffect(() => {
    if (size && weight > 0) {
      calculatePricing();
    }
  }, [size, weight]);

  const loadPostmats = async () => {
    try {
      const res = await axiosClient.get("/api/postmats/");
      setPostmats(res.data);
      
      // Set initial origin and destination from package
      const initialOrigin = res.data.find(p => p.name === pkg.origin_postmat_name);
      const initialDestination = res.data.find(p => p.name === pkg.destination_postmat_name);
      
      if (initialOrigin) setOrigin(initialOrigin);
      if (initialDestination) setDestination(initialDestination);
    } catch (err) {
      console.error("Failed to load postmats:", err);
      setMessage({
        type: "error",
        text: "Failed to load postmats. Please try again."
      });
    }
  };

  const calculatePricing = async () => {
    try {
      const res = await axiosClient.post("/api/packages/payments/calculate-price/", {
        size,
        weight: Number(weight),
      });
      setPricing(res.data);
    } catch (err) {
      console.error("Failed to calculate pricing:", err);
    }
  };

  const handleSubmit = async () => {
    if (!origin || !destination) {
      setMessage({ type: "error", text: "Please select both origin and destination postmat." });
      return;
    }

    if (!receiverName || !receiverPhone) {
      setMessage({ type: "error", text: "Please fill in receiver information." });
      return;
    }

    setLoading(true);
    setMessage(null);
    setActualOrigin(null);
    setShowStashChangeWarning(false);

    try {
      const res = await axiosClient.patch(`/api/packages/send-package/${pkg.id}`, {
        origin_postmat_id: origin.id,
        destination_postmat_id: destination.id,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_email: receiverEmail,
        size: size,
        weight: Number(weight),
      });

      // Check if origin postmat was changed due to stash availability
      if (res.data.origin_postmat !== origin.name) {
        const changedOrigin = postmats.find(p => p.name === res.data.origin_postmat);
        setActualOrigin(changedOrigin);
        setShowStashChangeWarning(true);
        
        setMessage({
          type: "warning",
          text: `Selected origin changed to ${res.data.origin_postmat} due to stash availability.`,
        });
      } else {
        setMessage({
          type: "success",
          text: res.data.message || "Package updated successfully!",
        });
      }

      // Show pricing recalculation message if applicable
      if (res.data.pricing_recalculated) {
        setTimeout(() => {
          setMessage({
            type: "info",
            text: `Package updated! New price: $${res.data.payment.amount}`,
          });
        }, 2000);
      }

      // Close modal and refresh parent after success (only if no warning)
      if (res.data.origin_postmat === origin.name) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to update package:", err);
      
      let errorText = "Failed to update package.";
      let errorDetails = [];
      
      if (err.response?.data?.error) {
        errorText = err.response.data.error;
      } else if (err.response?.data) {
        if (typeof err.response.data === "string") {
          errorText = err.response.data;
        } else if (Array.isArray(err.response.data)) {
          errorDetails = err.response.data;
        } else if (typeof err.response.data === "object") {
          // Flatten object errors
          Object.entries(err.response.data).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              messages.forEach(msg => errorDetails.push(`${field}: ${msg}`));
            } else {
              errorDetails.push(`${field}: ${messages}`);
            }
          });
        }
      }
      
      setMessage({
        type: "error",
        text: errorText,
        details: errorDetails.length > 0 ? errorDetails : null
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeChange = () => {
    setShowStashChangeWarning(false);
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 500);
  };

  const distance =
    actualOrigin && origin && actualOrigin.id !== origin.id
      ? getDistance(
          origin.latitude,
          origin.longitude,
          actualOrigin.latitude,
          actualOrigin.longitude
        ).toFixed(2)
      : null;

  const mapProps = { 
    postmats, 
    origin, 
    destination, 
    setOrigin, 
    setDestination, 
    actualOrigin 
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-2xl z-10">
          <h2 className="text-2xl font-bold text-blue-900">Edit Package</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Warning Banner */}
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 mb-6">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Note:</strong> After payment completion, you won't be able to edit any parcel information. 
              Complete payment later in the Account tab if you're unsure about details.
            </p>
          </div>

          {/* Messages */}
          {message && (
            <div
              className={`p-4 rounded-xl mb-6 border-2 ${
                message.type === "error"
                  ? "bg-red-50 text-red-800 border-red-300"
                  : message.type === "warning"
                  ? "bg-orange-50 text-orange-800 border-orange-300"
                  : message.type === "info"
                  ? "bg-blue-50 text-blue-800 border-blue-300"
                  : "bg-green-50 text-green-800 border-green-300"
              }`}
            >
              <p className="font-semibold mb-1">{message.text}</p>
              {message.details && message.details.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm">
                  {message.details.map((detail, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Stash Change Warning with Distance */}
          {showStashChangeWarning && actualOrigin && distance && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-6">
              <p className="font-bold text-orange-900 mb-2">
                🔄 Origin Postmat Changed
              </p>
              <p className="text-sm text-orange-800 mb-3">
                The selected origin postmat didn't have an available stash for your package size. 
                We've automatically assigned the nearest available postmat: <strong>{actualOrigin.name}</strong>
              </p>
              <p className="text-sm text-orange-700 mb-4">
                📍 Distance from your selected origin: <strong>{distance} km</strong>
              </p>
              <button
                onClick={handleAcknowledgeChange}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-semibold transition-colors"
              >
                I Understand, Continue
              </button>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* LEFT — FORM */}
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-gray-800">Package Details</h3>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Receiver Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Receiver Phone</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Receiver Email</label>
                <input
                  type="email"
                  className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={receiverEmail}
                  onChange={(e) => setReceiverEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Size</label>
                <select
                  className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  disabled={loading}
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-gray-700 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-xl p-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  min="1"
                  disabled={loading}
                />
              </div>

              {/* Current Pricing */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="font-semibold text-gray-800 mb-2">Current Price:</p>
                <p className="text-2xl font-bold text-blue-900">${pkg.payment_amount}</p>
              </div>

              {/* New Pricing Display */}
              {pricing && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <p className="font-semibold text-blue-900 mb-2">New Estimated Price:</p>
                  <div className="space-y-1 text-sm text-gray-800">
                    <p>Base Price: ${pricing.base_price}</p>
                    <p>Size Surcharge: ${pricing.size_surcharge}</p>
                    <p>Weight Surcharge: ${pricing.weight_surcharge}</p>
                    <hr className="my-2 border-blue-200" />
                    <p className="text-xl font-bold text-blue-900">
                      Total: ${pricing.total} {pricing.currency}
                    </p>
                  </div>
                  {pricing.total !== pkg.payment_amount && (
                    <p className="text-sm text-orange-600 mt-2">
                      ⚠️ Price will be updated after saving changes
                    </p>
                  )}
                </div>
              )}

              {/* Selected postmats info */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-700">
                  <b>Origin:</b> {origin ? origin.name : "Not selected"}
                </p>
                <p className="text-sm text-gray-700">
                  <b>Destination:</b> {destination ? destination.name : "Not selected"}
                </p>
                {actualOrigin && distance && (
                  <p className="text-sm text-orange-600 mt-2">
                    ⚠️ Actual origin: <strong>{actualOrigin.name}</strong> ({distance} km away)
                  </p>
                )}
              </div>
            </div>

            {/* RIGHT — MAP */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Select Postmats
              </h3>
              <div className="h-[500px] rounded-xl overflow-hidden border border-gray-200">
                <ParcelMapSendPackage {...mapProps} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-6 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || showStashChangeWarning}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Updating...</span>
                </>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}