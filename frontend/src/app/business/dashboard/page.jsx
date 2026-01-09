"use client";

import { useEffect, useState } from "react";
import api from "@/axios/api";
import { Package, CreditCard, Warehouse } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

export default function DashboardPage() {
  const [stats, setStats] = useState({ total_packages: 0, unpaid_packages: 0, total_magazines: 0 });
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const sessionId = searchParams.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      // Verify payment with backend to ensure status is updated
      api.post("api/business/payment/verify", { session_id: sessionId })
        .then(() => {
          fetchStats();
          router.replace("/business/dashboard"); // Clean URL
        })
        .catch((err) => console.error("Payment verification failed", err));
    } else {
      fetchStats();
    }
  }, [searchParams]);

  const fetchStats = () => {
    api.get("api/business/dashboard/stats") // You need to map this URL in backend urls.py
      .then((res) => setStats(res.data))
      .catch((err) => console.error(err));
  };

  const cards = [
    {
      title: "Total Packages",
      value: stats.total_packages,
      icon: <Package className="w-8 h-8 text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      title: "Unpaid Packages",
      value: stats.unpaid_packages,
      icon: <CreditCard className="w-8 h-8 text-red-600" />,
      bg: "bg-red-50",
    },
    {
      title: "Active Magazines",
      value: stats.total_magazines,
      icon: <Warehouse className="w-8 h-8 text-green-600" />,
      bg: "bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, i) => (
        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4">
          <div className={`p-4 rounded-xl ${card.bg}`}>{card.icon}</div>
          <div>
            <p className="text-sm text-gray-500 font-medium">{card.title}</p>
            <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}
