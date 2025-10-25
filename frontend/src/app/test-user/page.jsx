"use client";

import { useEffect, useState } from "react";
import Header from "../components/Header";

export default function DashboardTest() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("http://localhost:8000/accounts/user/info/", {
          credentials: "include", // sends HttpOnly cookie for authentication
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();
        setUser(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchUser();
  }, []);

  return (
    <div>
      <Header />
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6">
        <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-3xl font-semibold text-blue-700 mb-6">Dashboard Test</h1>

          {error && <p className="text-red-500">{error}</p>}

          {user ? (
            <div className="text-left space-y-2 text-gray-700">
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>First Name:</strong> {user.first_name || "-"}</p>
              <p><strong>Last Name:</strong> {user.last_name || "-"}</p>
              <p><strong>Phone:</strong> {user.phone_number || "-"}</p>
              <p><strong>Role:</strong> {user.role}</p>
              <p><strong>Active:</strong> {user.is_active ? "Yes" : "No"}</p>
              <p><strong>Joined:</strong> {new Date(user.date_joined).toLocaleString()}</p>
            </div>
          ) : (
            !error && <p className="text-gray-500">Loading...</p>
          )}
        </div>
      </main>
    </div>
  );
}
