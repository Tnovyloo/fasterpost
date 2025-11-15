"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/axios/api";
import { useRouter } from "next/navigation";

// Client-side only map
const ParcelMap = dynamic(() => import("../components/ParcelMapInner"), { ssr: false });

export default function SendPackage() {
  const router = useRouter();

  const [postmats, setPostmats] = useState([]);
  const [originPostmatId, setOriginPostmatId] = useState(""); // use empty string!
  const [destinationPostmatId, setDestinationPostmatId] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [size, setSize] = useState("small");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPostmats = async () => {
      try {
        const res = await api.get("/api/postmats/");
        setPostmats(res.data);
      } catch (err) {
        console.error("Failed to load postmats:", err);
      }
    };
    fetchPostmats();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    if (!originPostmatId || !destinationPostmatId) {
      setError("Wybierz paczkomat nadawczy i docelowy.");
      setSubmitting(false);
      return;
    }

    try {
      const { data } = await api.post("/api/packages/send-package/", {
        origin_postmat_id: originPostmatId,
        destination_postmat_id: destinationPostmatId,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        size,
        weight: Number(weight),
      });

      setSuccess("Paczka zarejestrowana! Przekierowywanie…");
      setTimeout(() => router.push(`/package/${data.package_id}`), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Błąd wysyłania paczki.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-6 gap-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl bg-white shadow-lg rounded-xl p-6 flex flex-col gap-4"
      >
        <h1 className="text-2xl font-bold mb-4 text-black">Wyślij paczkę</h1>

        {/* Postmat inputs */}
        <div>
          <label className="block text-black mb-1">Paczkomat nadawczy</label>
          <input
            type="text"
            value={originPostmatId || ""}
            onChange={(e) => setOriginPostmatId(e.target.value)}
            placeholder="Kliknij na mapie, aby wybrać"
            className="w-full border p-2 rounded-lg text-black"
        />

        </div>

        <div>
          <label className="block text-black mb-1">Paczkomat docelowy</label>

                {/* Destination input */}
                <input
                type="text"
                value={destinationPostmatId}
                onChange={(e) => setDestinationPostmatId(e.target.value)}
                placeholder="Kliknij na mapie, aby wybrać"
                className="w-full border p-2 rounded-lg text-black"
                />


        </div>

        {/* Receiver info */}
        <div>
          <label className="block text-black mb-1">Imię i nazwisko odbiorcy</label>
          <input
            type="text"
            value={receiverName}
            onChange={(e) => setReceiverName(e.target.value)}
            className="w-full border p-2 rounded-lg text-black"
            required
          />
        </div>

        <div>
          <label className="block text-black mb-1">Telefon odbiorcy</label>
          <input
            type="tel"
            value={receiverPhone}
            onChange={(e) => setReceiverPhone(e.target.value)}
            className="w-full border p-2 rounded-lg text-black"
            required
          />
        </div>

        <div>
          <label className="block text-black mb-1">Rozmiar paczki</label>
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full border p-2 rounded-lg text-black"
          >
            <option value="small">Mała</option>
            <option value="medium">Średnia</option>
            <option value="large">Duża</option>
          </select>
        </div>

        <div>
          <label className="block text-black mb-1">Waga (kg)</label>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full border p-2 rounded-lg text-black"
            required
          />
        </div>

        {error && <p className="text-red-600">{error}</p>}
        {success && <p className="text-green-600">{success}</p>}

        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-2 rounded-lg text-white font-medium ${
            submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitting ? "Wysyłanie…" : "Wyślij paczkę"}
        </button>

        {/* Map */}
        <div className="mt-4 w-full h-96">
          <ParcelMap
            postmats={postmats}
            selectedOriginId={originPostmatId}
            selectedDestinationId={destinationPostmatId}
            onSelect={(pm, type) => {
              if (type === "origin") setOriginPostmatId(pm.id);
              else setDestinationPostmatId(pm.id);
            }}
          />
        </div>
      </form>
    </div>
  );
}
