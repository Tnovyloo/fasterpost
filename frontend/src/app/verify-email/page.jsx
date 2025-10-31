"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "../components/Header";
import api from "@/axios/api";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const uid = searchParams.get("uid");
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!uid || !token) {
        setError("Nieprawidłowy link weryfikacyjny.");
        setLoading(false);
        return;
      }

      try {
        const res = await api.post(
          `/accounts/user/verify/${uid}/${token}`,
          { uid, verify_token: token },
          { withCredentials: true }
        );
        setMessage(res.data.status || "Adres e-mail został zweryfikowany!");
        localStorage.setItem("isLoggedIn", "true");
      } catch (err) {
        setError(err.response?.data?.detail || err.message || "Błąd weryfikacji.");
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [uid, token]);

  return (
    <div>
      <Header />
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-amber-50 p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="backdrop-blur-xl bg-white/70 border border-blue-100/50 rounded-2xl shadow-2xl p-8 text-center">
            <h1 className="text-3xl font-semibold text-blue-700 mb-6">
              Weryfikacja e-mail ✨
            </h1>

            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <span className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span className="text-gray-700">Sprawdzanie linku...</span>
              </div>
            ) : error ? (
              <div className="text-red-500 text-sm">{error}</div>
            ) : (
              <div className="flex flex-col gap-4 items-center">
                <p className="text-green-600 text-base">{message}</p>
                <button
                  onClick={() => router.push("/login")}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-lg"
                >
                  Przejdź do logowania
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
