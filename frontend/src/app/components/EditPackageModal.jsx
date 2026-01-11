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
  const isEditing = !!pkg?.id;

  const [postmats, setPostmats] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [receiverName, setReceiverName] = useState(pkg?.receiver_name || "");
  const [receiverPhone, setReceiverPhone] = useState(pkg?.receiver_phone || "");
  const [receiverEmail, setReceiverEmail] = useState(pkg?.receiver_email || "");
  const [size, setSize] = useState(pkg?.size || "small");
  const [weight, setWeight] = useState(pkg?.weight || 1);
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
      
      if (isEditing) {
          const initialOrigin = res.data.find(p => p.name === pkg.origin_postmat_name);
          const initialDestination = res.data.find(p => p.name === pkg.destination_postmat_name);
          if (initialOrigin) setOrigin(initialOrigin);
          if (initialDestination) setDestination(initialDestination);
      }
    } catch (err) {
      console.error("Failed to load postmats:", err);
      setMessage({ type: "error", text: "Failed to load postmats." });
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
      setMessage({ type: "error", text: "Please select both origin and destination." });
      return;
    }
    if (!receiverName || !receiverPhone) {
      setMessage({ type: "error", text: "Please fill in receiver info." });
      return;
    }

    setLoading(true);
    setMessage(null);
    setActualOrigin(null);
    setShowStashChangeWarning(false);

    try {
      const payload = {
        origin_postmat_id: origin.id,
        destination_postmat_id: destination.id,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_email: receiverEmail,
        size: size,
        weight: Number(weight),
      };

      let res;
      if (isEditing) {
        // PATCH existing package
        res = await axiosClient.patch(`/api/packages/send-package/${pkg.id}/`, payload);
      } else {
        // POST new package
        res = await axiosClient.post("/api/packages/send-package/", payload);
      }

      // Check if origin postmat changed (Logic for stash availability)
      const returnedOriginName = res.data.origin_postmat || res.data.origin_postmat_name; // API might return name differently on create vs update
      
      if (returnedOriginName && returnedOriginName !== origin.name) {
        const changedOrigin = postmats.find(p => p.name === returnedOriginName);
        setActualOrigin(changedOrigin);
        setShowStashChangeWarning(true);
        setMessage({
          type: "warning",
          text: `Origin changed to ${returnedOriginName} due to availability.`,
        });
      } else {
        setMessage({
          type: "success",
          text: isEditing ? "Package updated!" : "Package created!",
        });
        
        // If no warning, close after delay
        setTimeout(() => {
            onSuccess();
            onClose();
        }, 1500);
      }

    } catch (err) {
      console.error("Submit error:", err);

      let errorText = err.message || "Operation failed.";

      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          errorText = err.response.data;
        } else if (Array.isArray(err.response.data)) {
          errorText = err.response.data.join(", ");
        } else if (typeof err.response.data === "object") {
          errorText = Object.values(err.response.data).flat().join(", ");
        }
      }
      setMessage({ type: "error", text: errorText });
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

  const distance = actualOrigin && origin && actualOrigin.id !== origin.id
      ? getDistance(origin.latitude, origin.longitude, actualOrigin.latitude, actualOrigin.longitude).toFixed(2)
      : null;

  const mapProps = { postmats, origin, destination, setOrigin, setDestination, actualOrigin };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-8 py-5 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? "Edit Package" : "Send New Package"}
          </h2>
          <button onClick={onClose} disabled={loading} className="p-2 hover:bg-gray-100 rounded-full transition">
            ✕
          </button>
        </div>

        <div className="p-8">
            {/* Messages */}
            {message && (
                <div className={`p-4 rounded-xl mb-6 border ${
                    message.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                    message.type === 'warning' ? 'bg-orange-50 border-orange-200 text-orange-800' :
                    'bg-green-50 border-green-200 text-green-700'
                }`}>
                    <p className="font-bold">{message.text}</p>
                </div>
            )}

             {/* Stash Warning */}
             {showStashChangeWarning && actualOrigin && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8 shadow-sm">
                    <h4 className="font-bold text-orange-900 text-lg mb-2">⚠️ Station Changed</h4>
                    <p className="text-orange-800 mb-4">
                        Your selected station was full. We moved your reservation to <strong>{actualOrigin.name}</strong> 
                        which is {distance}km away.
                    </p>
                    <button onClick={handleAcknowledgeChange} className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-700 transition">
                        Accept & Continue
                    </button>
                </div>
             )}

             <div className="grid lg:grid-cols-2 gap-10">
                
                {/* Form Section */}
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Size</label>
                            <select 
                                value={size} 
                                onChange={e => setSize(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                                disabled={loading}
                            >
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Weight (kg)</label>
                            <input 
                                type="number" 
                                value={weight} 
                                onChange={e => setWeight(e.target.value)}
                                min="1"
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <input 
                            placeholder="Receiver Name" 
                            value={receiverName} 
                            onChange={e => setReceiverName(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            disabled={loading}
                        />
                        <input 
                            placeholder="Receiver Phone" 
                            value={receiverPhone} 
                            onChange={e => setReceiverPhone(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            disabled={loading}
                        />
                         <input 
                            placeholder="Receiver Email" 
                            type="email"
                            value={receiverEmail} 
                            onChange={e => setReceiverEmail(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            disabled={loading}
                        />
                    </div>

                    {/* Pricing Card */}
                    {pricing && (
                        <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-blue-600 font-bold uppercase">Estimated Total</p>
                                <p className="text-xs text-blue-400">Includes size & weight fees</p>
                            </div>
                            <p className="text-3xl font-bold text-blue-900">${pricing.total}</p>
                        </div>
                    )}
                </div>

                {/* Map Section */}
                <div className="h-[400px] lg:h-auto min-h-[400px] rounded-xl overflow-hidden border border-gray-200 relative">
                     <ParcelMapSendPackage {...mapProps} />
                     
                     {/* Overlay Stats */}
                     <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg border border-gray-200 shadow-sm text-xs flex justify-between z-[1000]">
                        <div>
                            <span className="block text-gray-500 uppercase font-bold text-[10px]">Origin</span>
                            <span className="font-bold text-gray-900">{origin ? origin.name : "Select on Map"}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-gray-500 uppercase font-bold text-[10px]">Destination</span>
                            <span className="font-bold text-gray-900">{destination ? destination.name : "Select on Map"}</span>
                        </div>
                     </div>
                </div>

             </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 sticky bottom-0 rounded-b-2xl">
            <button onClick={onClose} disabled={loading} className="px-6 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition">
                Cancel
            </button>
            <button 
                onClick={handleSubmit} 
                disabled={loading || showStashChangeWarning} 
                className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {isEditing ? "Update Package" : "Create & Proceed to Pay"}
            </button>
        </div>

      </div>
    </div>
  );
}