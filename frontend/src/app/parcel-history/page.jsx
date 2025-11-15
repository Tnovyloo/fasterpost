"use client"

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

import Header from "../components/Header";
import Footer from "../components/Header";

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
        setSelectedParcel(parcel);
        if (parcel.destination_postmat_location) {
            setPostmatLocation({
                lat : parcel.destination_postmat_location.latitude,
                lng : parcel.destination_postmat_location.longitude
            });
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
            <Header />
            <main className="flex-1 px-6 py-10">
                <h1 className="text-2xl font-bold text-blue-800 mb-6">Parcel history 📜</h1>

                {history.length === 0 ? (
                    <p className="text-gray-600">No past parcels.</p>
                ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                        <h2 className="text-lg font-semibold mb-3 text-gray-700">
                            Parcel list:
                        </h2>
                        <div className="grid gap-4">
                        {history.map((p) => (
                            <div key={p.id}
                                className={`p-4 border rounded-xl shadow-sm cursor-pointer transition hover:bg-blue-50 ${
                                    selectedParcel?.id === p.id ? "bg-blue-100" : "bg-white" }`}
                                
                                onClick={() => handleSelectParcel(p)}>

                                <p className="font-medium text-blue-700">📦 {p.id}</p>
                                <p className="text-sm text-gray-600">
                                    Status: {p.latest_status_display || "N/A"}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Last actualization: {p.updated_at}
                                </p>
                            </div>
                        ))}
                        </div>
                    </div>
                )}

                <div>
                    {selectedParcel ? (
                        <div className="space-y-4">
                            <div classname="p-4 bg-white rounded-xl shadow">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                    Parcel Details (ID: {selectedParcel.id})
                                </h3>

                                <p>ID: {selectedParcel.id}</p>
                                <p>Status: {selectedParcel.latest_status_display || "N/A"}</p>
                            </div>

                            {postmatLocation && (
                                <div className="h-64 w-full overflow-hidden rounded-xl shadow">
                                    <ParcelMap location={postmatLocation} />      
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-gray-600 mt-10">
                            Choose a parcel to see details and postmat location.
                        </p>
                    )}
                </div>            
            </main>
            <Footer />
        </div>
    );
}
