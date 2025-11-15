"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/axios/api";

const ParcelMapInner = dynamic(() => import("./ParcelMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] bg-gray-200 rounded-xl flex items-center justify-center">
      Ładowanie mapy…
    </div>
  ),
});

export default function ParcelMap({
  selecting,
  selectedOriginId,
  selectedDestinationId,
  onSelectOrigin,
  onSelectDestination,
}) {
  const [postmats, setPostmats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPostmats = async () => {
      try {
        const res = await api.get("/api/postmats/");
        setPostmats(res.data);
      } catch (err) {
        console.error(err);
        setError("Nie udało się załadować paczkomatów.");
      } finally {
        setLoading(false);
      }
    };
    fetchPostmats();
  }, []);

  if (loading) return <div className="w-full h-[300px] bg-gray-200 rounded-xl flex items-center justify-center">Ładowanie…</div>;
  if (error) return <div className="w-full h-[300px] bg-red-100 text-red-700 rounded-xl flex items-center justify-center p-4">{error}</div>;

  return (
    <ParcelMapInner
      postmats={postmats}
      selecting={selecting}
      selectedOriginId={selectedOriginId}
      selectedDestinationId={selectedDestinationId}
      onSelectOrigin={onSelectOrigin}
      onSelectDestination={onSelectDestination}
    />
  );
}
