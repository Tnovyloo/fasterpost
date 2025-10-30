"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import api from "@/axios/api";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // 30s delay

  // Cooldown logic for resend
  const startCooldown = () => {
    setCooldown(30); // 30 seconds cooldown
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Proszę wpisać adres e-mail.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/accounts/user/password-reset", {
        email: email.trim(),
      });

      // Axios throws on non-2xx responses
      setMessage(data?.status || "E-mail do resetowania hasła został wysłany!");
      startCooldown();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Wystąpił nieoczekiwany błąd.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header />
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="backdrop-blur-xl bg-white/70 border border-blue-200/50 rounded-2xl shadow-2xl p-8">
            <h1 className="text-3xl font-semibold text-center text-blue-900 mb-6">
              Resetowanie hasła 🔑
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <InputField
                label="Adres e-mail"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="adres@email.com"
              />

              {error && (
                <div className="text-red-500 text-sm text-center animate-fade-in">
                  {error}
                </div>
              )}

              {message && (
                <div className="text-green-600 text-sm text-center animate-fade-in">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || cooldown > 0}
                className={`bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center ${
                  loading || cooldown > 0 ? "opacity-80 cursor-wait" : ""
                }`}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Wysyłanie...</span>
                  </div>
                ) : cooldown > 0 ? (
                  `Odczekaj ${cooldown}s`
                ) : (
                  "Wyślij e-mail"
                )}
              </button>
            </form>

            <div className="text-sm text-center mt-6 text-blue-800">
              Pamiętasz hasło?{" "}
              <Link href="/login" className="font-semibold text-blue-900 hover:underline">
                Zaloguj się
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm font-medium text-blue-900 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/90 text-blue-900 border border-blue-300 rounded-xl px-4 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-400 transition"
        required
      />
    </div>
  );
}
