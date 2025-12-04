// "use client";

// import { useEffect, useState } from "react";
// import dynamic from "next/dynamic";
// import api from "@/axios/api";
// import Header from "../components/Header";
// import Footer from "../components/Footer";

// // Leaflet map dynamically loaded (CSR)
// const ParcelMapSendPackage = dynamic(
//   () => import("../components/ParcelMapSendPackage"),
//   { ssr: false, loading: () => <p>Loading map...</p> }
// );

// // Haversine formula for distance (km)
// function getDistance(lat1, lon1, lat2, lon2) {
//   const R = 6371; // km
//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLon = ((lon2 - lon1) * Math.PI) / 180;
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos((lat1 * Math.PI) / 180) *
//       Math.cos((lat2 * Math.PI) / 180) *
//       Math.sin(dLon / 2) ** 2;
//   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//   return R * c;
// }

// export default function SendPackagePage() {
//   const [postmats, setPostmats] = useState([]);
//   const [origin, setOrigin] = useState(null);
//   const [destination, setDestination] = useState(null);
//   const [receiverName, setReceiverName] = useState("");
//   const [receiverPhone, setReceiverPhone] = useState("");
//   const [size, setSize] = useState("small");
//   const [weight, setWeight] = useState(1);
//   const [loading, setLoading] = useState(false);
//   const [response, setResponse] = useState(null);
//   const [message, setMessage] = useState(null);

//   useEffect(() => {
//     api.get("/api/postmats/").then((res) => setPostmats(res.data));
//   }, []);

//   const handleSubmit = async () => {
//     if (!origin || !destination) {
//       setMessage({ type: "error", text: "Please select both origin and destination postmat." });
//       return;
//     }

//     setLoading(true);
//     setMessage(null);

//     try {
//       const res = await api.post("/api/packages/send-package/", {
//         origin_postmat_id: origin.id,
//         destination_postmat_id: destination.id,
//         receiver_name: receiverName,
//         receiver_phone: receiverPhone,
//         size: size,
//         weight: Number(weight),
//       });

//       setResponse(res.data);

//       if (res.data.origin_postmat !== origin.name) {
//         setMessage({
//           type: "warning",
//           text: `Selected origin changed to ${res.data.origin_postmat} due to availability.`,
//         });
//       } else {
//         setMessage({
//           type: "success",
//           text: "Package created successfully!",
//         });
//       }
//     } catch (err) {
//         console.log(err);
//         let errorText = "Failed to send package.";
        
//         // Show server-provided error if available
//         if (err.response?.data) {
//           if (typeof err.response.data === "string") {
//             errorText += ` ${err.response.data}`;
//           } else if (Array.isArray(err.response.data)) {
//             errorText += ` ${err.response.data.join(", ")}`;
//           } else if (typeof err.response.data === "object") {
//             // flatten object messages
//             const messages = Object.values(err.response.data).flat();
//             errorText += ` ${messages.join(", ")}`;
//           }
//         }
      
//         setMessage({
//           type: "error",
//           text: errorText,
//         });
//     }

//     setLoading(false);
//   };

//   const actualOrigin = response
//     ? postmats.find((p) => p.name === response.origin_postmat)
//     : null;

//   const distance =
//     actualOrigin && origin && actualOrigin.id !== origin.id
//       ? getDistance(
//           origin.latitude,
//           origin.longitude,
//           actualOrigin.latitude,
//           actualOrigin.longitude
//         ).toFixed(2)
//       : null;

//   const mapProps = { postmats, origin, destination, setOrigin, setDestination, actualOrigin };

//   return (
//     <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
//       <Header />

//       <main className="flex-1 px-6 py-10 pt-24 max-w-6xl mx-auto w-full">
//         <h1 className="text-3xl font-bold text-blue-900 mb-8 tracking-tight">
//           📦 Send a Package
//         </h1>

//         <div className="grid md:grid-cols-2 gap-10">
//           {/* LEFT — FORM */}
//           <div className="bg-white shadow p-6 rounded-2xl space-y-5 border">
//             <h2 className="text-xl font-semibold text-black">Package Info</h2>

//             <div>
//               <label className="block font-medium text-black">Receiver Name</label>
//               <input
//                 type="text"
//                 className="w-full border rounded-xl p-2 mt-1 text-black"
//                 value={receiverName}
//                 onChange={(e) => setReceiverName(e.target.value)}
//               />
//             </div>

//             <div>
//               <label className="block font-medium text-black">Receiver Phone</label>
//               <input
//                 type="text"
//                 className="w-full border rounded-xl p-2 mt-1 text-black"
//                 value={receiverPhone}
//                 onChange={(e) => setReceiverPhone(e.target.value)}
//               />
//             </div>

//             <div>
//               <label className="block font-medium text-black">Size</label>
//               <select
//                 className="w-full border rounded-xl p-2 mt-1 text-black"
//                 value={size}
//                 onChange={(e) => setSize(e.target.value)}
//               >
//                 <option value="small">Small</option>
//                 <option value="medium">Medium</option>
//                 <option value="large">Large</option>
//               </select>
//             </div>

//             <div>
//               <label className="block font-medium text-black">Weight (kg)</label>
//               <input
//                 type="number"
//                 className="w-full border rounded-xl p-2 mt-1 text-black"
//                 value={weight}
//                 onChange={(e) => setWeight(e.target.value)}
//                 min="1"
//               />
//             </div>

//             {/* Messages */}
//             {message && (
//               <div
//                 className={`p-3 rounded-xl mt-2 ${
//                   message.type === "error"
//                     ? "bg-red-100 text-red-700 border border-red-400"
//                     : message.type === "warning"
//                     ? "bg-yellow-100 text-yellow-800 border border-yellow-400"
//                     : "bg-green-100 text-green-700 border border-green-400"
//                 }`}
//               >
//                 {message.text}
//               </div>
//             )}

//             {/* Selected postmats */}
//             <div className="bg-gray-50 p-4 rounded-xl border text-black mt-2">
//               <p><b>Selected Origin:</b> {origin ? origin.name : "Not selected"}</p>
//               <p><b>Destination:</b> {destination ? destination.name : "Not selected"}</p>
//               {distance && (
//                 <p className="text-orange-600 mt-2">
//                   ⚠️ Nearest stash used. Distance from selected origin: {distance} km
//                 </p>
//               )}
//             </div>

//             <button
//               onClick={handleSubmit}
//               disabled={loading}
//               className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold shadow mt-2"
//             >
//               {loading ? "Sending..." : "Send Package"}
//             </button>

//             {response && (
//               <div className="bg-green-100 border border-green-400 p-4 rounded-xl mt-4 text-black">
//                 <p className="font-semibold text-green-700">Package Created!</p>
//                 <p><b>ID:</b> {response.package_id}</p>
//                 <p><b>Unlock Code:</b> {response.unlock_code}</p>
//                 <p><b>Using Postmat:</b> {response.origin_postmat}</p>
//               </div>
//             )}
//           </div>

//           {/* RIGHT — MAP */}
//           <div className="bg-white shadow p-4 rounded-2xl border">
//             <h2 className="text-xl font-semibold text-black mb-2">
//               Select Origin & Destination Postmats
//             </h2>
//             <div className="h-[500px] rounded-xl overflow-hidden">
//               <ParcelMapSendPackage {...mapProps} />
//             </div>
//           </div>
//         </div>
//       </main>

//       <Footer />
//     </div>
//   );
// }


"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import api from "@/axios/api";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PaymentForm from "../components/PaymentForm";

const ParcelMapSendPackage = dynamic(
  () => import("../components/ParcelMapSendPackage"),
  { ssr: false, loading: () => <p>Loading map...</p> }
);

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
console.log(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
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

export default function SendPackagePage() {
  const [postmats, setPostmats] = useState([]);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [size, setSize] = useState("small");
  const [weight, setWeight] = useState(1);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [message, setMessage] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    api.get("/api/postmats/").then((res) => setPostmats(res.data));
  }, []);

  // Calculate pricing when size or weight changes
  useEffect(() => {
    if (size && weight > 0) {
      calculatePricing();
    }
  }, [size, weight]);

  const calculatePricing = async () => {
    try {
      const res = await api.post("/api/packages/payments/calculate-price/", {
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

    try {
      const res = await api.post("/api/packages/send-package/", {
        origin_postmat_id: origin.id,
        destination_postmat_id: destination.id,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        size: size,
        weight: Number(weight),
      });

      setResponse(res.data);
      setClientSecret(res.data.payment.client_secret);
      setShowPayment(true);

      if (res.data.origin_postmat !== origin.name) {
        setMessage({
          type: "warning",
          text: `Selected origin changed to ${res.data.origin_postmat} due to availability.`,
        });
      } else {
        setMessage({
          type: "info",
          text: "Package created! Please complete payment to confirm.",
        });
      }
    } catch (err) {
      console.log(err);
      let errorText = "Failed to create package.";
      
      if (err.response?.data) {
        if (typeof err.response.data === "string") {
          errorText += ` ${err.response.data}`;
        } else if (Array.isArray(err.response.data)) {
          errorText += ` ${err.response.data.join(", ")}`;
        } else if (typeof err.response.data === "object") {
          const messages = Object.values(err.response.data).flat();
          errorText += ` ${messages.join(", ")}`;
        }
      }
    
      setMessage({
        type: "error",
        text: errorText,
      });
    }

    setLoading(false);
  };

  const handlePaymentSuccess = () => {
    setMessage({
      type: "success",
      text: "Payment successful! Your package has been confirmed.",
    });
    setShowPayment(false);
  };

  const actualOrigin = response
    ? postmats.find((p) => p.name === response.origin_postmat)
    : null;

  const distance =
    actualOrigin && origin && actualOrigin.id !== origin.id
      ? getDistance(
          origin.latitude,
          origin.longitude,
          actualOrigin.latitude,
          actualOrigin.longitude
        ).toFixed(2)
      : null;

  const mapProps = { postmats, origin, destination, setOrigin, setDestination, actualOrigin };

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

      <main className="flex-1 px-6 py-10 pt-24 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-bold text-blue-900 mb-8 tracking-tight">
          📦 Send a Package
        </h1>

        <div className="grid md:grid-cols-2 gap-10">
          {/* LEFT — FORM */}
          <div className="bg-white shadow p-6 rounded-2xl space-y-5 border">
            <h2 className="text-xl font-semibold text-black">Package Info</h2>

            <div>
              <label className="block font-medium text-black">Receiver Name</label>
              <input
                type="text"
                className="w-full border rounded-xl p-2 mt-1 text-black"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                disabled={showPayment}
              />
            </div>

            <div>
              <label className="block font-medium text-black">Receiver Phone</label>
              <input
                type="text"
                className="w-full border rounded-xl p-2 mt-1 text-black"
                value={receiverPhone}
                onChange={(e) => setReceiverPhone(e.target.value)}
                disabled={showPayment}
              />
            </div>

            <div>
              <label className="block font-medium text-black">Size</label>
              <select
                className="w-full border rounded-xl p-2 mt-1 text-black"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                disabled={showPayment}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-black">Weight (kg)</label>
              <input
                type="number"
                className="w-full border rounded-xl p-2 mt-1 text-black"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                min="1"
                disabled={showPayment}
              />
            </div>

            {/* Pricing Display */}
            {pricing && !showPayment && (
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-black">
                <p className="font-semibold text-blue-900 mb-2">Estimated Price:</p>
                <div className="space-y-1 text-sm">
                  <p>Base Price: ${pricing.base_price}</p>
                  <p>Size Surcharge: ${pricing.size_surcharge}</p>
                  <p>Weight Surcharge: ${pricing.weight_surcharge}</p>
                  <hr className="my-2 border-blue-200" />
                  <p className="text-lg font-bold text-blue-900">
                    Total: ${pricing.total} {pricing.currency}
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            {message && (
              <div
                className={`p-3 rounded-xl mt-2 ${
                  message.type === "error"
                    ? "bg-red-100 text-red-700 border border-red-400"
                    : message.type === "warning"
                    ? "bg-yellow-100 text-yellow-800 border border-yellow-400"
                    : message.type === "info"
                    ? "bg-blue-100 text-blue-800 border border-blue-400"
                    : "bg-green-100 text-green-700 border border-green-400"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Selected postmats */}
            <div className="bg-gray-50 p-4 rounded-xl border text-black mt-2">
              <p><b>Selected Origin:</b> {origin ? origin.name : "Not selected"}</p>
              <p><b>Destination:</b> {destination ? destination.name : "Not selected"}</p>
              {distance && (
                <p className="text-orange-600 mt-2">
                  ⚠️ Nearest stash used. Distance from selected origin: {distance} km
                </p>
              )}
            </div>

            {!showPayment ? (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold shadow mt-2 disabled:opacity-50"
              >
                {loading ? "Creating Package..." : "Create Package & Pay"}
              </button>
            ) : (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-black mb-3">Complete Payment</h3>
                {clientSecret && (
                  <Elements options={options} stripe={stripePromise}>
                    <PaymentForm 
                      onSuccess={handlePaymentSuccess}
                      packageId={response?.package_id}
                    />
                  </Elements>
                )}
              </div>
            )}

            {response && message?.type === "success" && (
              <div className="bg-green-100 border border-green-400 p-4 rounded-xl mt-4 text-black">
                <p className="font-semibold text-green-700">Package Confirmed!</p>
                <p><b>ID:</b> {response.package_id}</p>
                <p><b>Unlock Code:</b> {response.unlock_code}</p>
                <p><b>Using Postmat:</b> {response.origin_postmat}</p>
                <p className="text-sm mt-2 text-green-600">
                  You can now drop off your package at the postmat.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT — MAP */}
          <div className="bg-white shadow p-4 rounded-2xl border">
            <h2 className="text-xl font-semibold text-black mb-2">
              Select Origin & Destination Postmats
            </h2>
            <div className="h-[500px] rounded-xl overflow-hidden">
              <ParcelMapSendPackage {...mapProps} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}