"use client"

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import Header from "../components/Header";
import Footer from "../components/Header";
import ParcelTimeline from "../components/ParcelTimeline";

import api from "@/axios/api";

const ParcelMap = dynamic(() => import('../components/ParcelMap'), {
    ssr: false,
    loading: () => <p>Loading...</p>,
});

export default function ParcelHistoryPage() {
    const [history, setHistory] = useState([]);
    const [selectedParcel, setSelectedParcel] = useState(null);
    const [postmatLocation, setPostmatLocation] = useState(null);

    useEffect(() => {
        api.get("/api/packages/user")
            .then(response => setHistory(response.data));
    }, []);

    const handleSelectParcel = (parcel) => {
        api.get(`/api/packages/user/${parcel.id}`).then((res) => {
            const details = res.data;
            setSelectedParcel(details);

            if (details.destination_postmat_lat && details.destination_postmat_long) {
                setPostmatLocation({
                    lat: details.destination_postmat_lat,
                    lng: details.destination_postmat_long,
            });
            } else {
                setPostmatLocation(null);
            }
        });
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
            <Header />

            <main className="flex-1 px-6 py-10 pt-24 max-w-6xl mx-auto w-full">
                <h1 className="text-3xl font-bold text-blue-900 mb-8 tracking-tight">
                    📜 Parcel history
                </h1>

                {history.length === 0 ? (
                    <div className="text-center py-20 bg-white/60 rounded-2xl shadow">
                        <p className="text-gray-600 text-lg">No past parcels.</p>
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 gap-8">
                    
                    {/* LEFT COLUMN — LIST */}
                    <div className="space-y-4 sticky top-10 self-start">
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">
                        📦 Parcel list
                        </h2>

                        <div className="flex flex-col gap-4">
                        {history.map((p) => (
                            <div
                            key={p.id}
                            onClick={() => handleSelectParcel(p)}
                            className={`
                                p-5 rounded-xl border shadow-sm cursor-pointer transition-all
                                hover:shadow-md hover:border-blue-400
                                ${selectedParcel?.id === p.id 
                                ? "bg-blue-100 border-blue-400" 
                                : "bg-white"} 
                            `}
                            >
                            <p className="text-blue-800 font-semibold text-lg">
                                {p.id}
                            </p>

                            <p className="text-gray-600 text-sm">
                                Status: <span className="font-medium">{p.latest_status_display}</span>
                            </p>

                            <p className="text-gray-500 text-xs mt-1">
                                Last update: {p.updated_at}
                            </p>
                            </div>
                        ))}
                        </div>
                    </div>

                    {/* RIGHT COLUMN — DETAILS */}
                    <div>
                        {selectedParcel ? (
                            <div className="space-y-6 bg-white rounded-2xl shadow p-3 border">

                                {/* DETAILS CARD */}
                                <div className="bg-white rounded-2xl shadow p-6 border">
                                    <h3 className="text-xl font-semibold text-gray-800 mb-4">
                                        📦 Parcel Details
                                    </h3>

                                    <div className="space-y-2 text-gray-700">
                                        <p><span className="font-semibold">ID:</span> {selectedParcel.id}</p>
                                        <p>
                                            <span className="font-semibold">Status:</span>{" "}
                                            {selectedParcel?.actualizations?.[0].status_display || "N/A"}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Receiver name:</span>{" "}
                                            {selectedParcel.receiver_name || "N/A"}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Receiver phone:</span>{" "}
                                            {selectedParcel.receiver_phone || "N/A"}
                                        </p>
                                        <p>
                                            <span className="font-semibold">Size:</span>{" "}
                                            {selectedParcel.size_display || "N/A"}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-6 rounded-xl shadow-md border border-gray-100">
                                    {/* MAP CARD */}
                                    <div className="p-1 rounded-xl">
                                        {postmatLocation ? (
                                            <div className="h-64 w-full overflow-hidden rounded-xl border">
                                                <ParcelMap location={postmatLocation} />
                                            </div>
                                        ) : (
                                            <p className="text-gray-600 text-sm">
                                                No location available for this parcel.
                                            </p>
                                        )}
                                    </div>

                                    <ParcelTimeline actualizations={selectedParcel.actualizations} />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center bg-white/70 rounded-2xl py-16 shadow border">
                                <p className="text-gray-600 text-lg">
                                Select a parcel from the list to see details and its postmat location.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                )}
            </main>

            <Footer />
        </div>
        );
}
