"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../components/Header";
import api from "@/axios/api";

export default function PasswordResetVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Get UID and token from URL
  const uid = searchParams.get("uid");
  const token = searchParams.get("token");


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!password1 || !password2) {
      setError("Proszę wypełnić oba pola hasła.");
      return;
    }

    if (password1 !== password2) {
      setError("Hasła muszą być takie same.");
      return;
    }

    setLoading(true);
    try {
      // ✅ Axios POST request
      const { data } = await api.post(
        `/accounts/user/password-reset-verify/${uid}/${token}`,
        {
          uid,
          verify_token: token,
          password_1: password1,
          password_2: password2,
        }
      );

      localStorage.setItem("isLoggedIn", "true");
      
      setMessage("Hasło zostało zmienione pomyślnie! Przekierowanie...");
      setTimeout(() => router.push("/"), 3000);
    } catch (err) {
      // ✅ Clean, detailed error handling
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
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100 p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="backdrop-blur-xl bg-white/70 border border-purple-200/50 rounded-2xl shadow-2xl p-8">
            <h1 className="text-3xl font-semibold text-center text-purple-900 mb-6">
              Reseting password 🔒
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <InputField
                label="New password"
                type="password"
                value={password1}
                onChange={setPassword1}
                placeholder="••••••••"
              />
              <InputField
                label="Repeat password"
                type="password"
                value={password2}
                onChange={setPassword2}
                placeholder="••••••••"
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
                disabled={loading}
                className={`bg-purple-600 text-white py-2.5 rounded-xl font-semibold hover:bg-purple-700 transition flex items-center justify-center ${
                  loading ? "opacity-80 cursor-wait" : ""
                }`}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Reseting...</span>
                  </div>
                ) : (
                  "Reset password"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder }) {
  return (
    <div>
      <label className="text-sm font-medium text-purple-900 mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/90 text-purple-900 border border-purple-300 rounded-xl px-4 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-purple-400 transition"
        required
      />
    </div>
  );
}
