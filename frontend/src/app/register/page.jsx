"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import api from "@/axios/api";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0); // seconds left for resend button

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Hasła muszą być takie same.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/accounts/user/register", {
        password_1: password,
        password_2: confirmPassword,
        email: email,
      });

      // Axios automatically throws on non-2xx responses, so no need for `!res.ok`
      setMessage(data?.status || "Rejestracja zakończona sukcesem!");
      setError("");
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

  const handleResend = async () => {
    if (!email) {
      setError("Proszę wpisać adres e-mail, aby wysłać link weryfikacyjny.");
      return;
    }

    if (cooldown > 0) return;

    setError("");
    setMessage("");

    try {
      const { data } = await api.post("/accounts/user/resend-verification-email", {
        email,
      });

      setMessage(
        data?.status || "Link weryfikacyjny został ponownie wysłany!"
      );
      startCooldown();
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Wystąpił nieoczekiwany błąd.";
      setError(msg);
    }
  };

  const startCooldown = () => {
    setCooldown(10);
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

  return (
    <div>
        <Header></Header>
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-100 via-yellow-100 to-orange-100 p-6">
        <div className="w-full max-w-md animate-fade-in">
            <div className="backdrop-blur-xl bg-white/70 border border-amber-200/50 rounded-2xl shadow-2xl p-8">
            <h1 className="text-3xl font-semibold text-center text-amber-800 mb-6">
                Utwórz konto ✨
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <InputField
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="adres@email.com"
                />
                <InputField
                label="Hasło"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                />
                <InputField
                label="Powtórz hasło"
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
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
                className={`bg-amber-500 text-white py-2.5 rounded-xl font-semibold hover:bg-amber-600 transition flex items-center justify-center ${
                    loading ? "opacity-80 cursor-wait" : ""
                }`}
                >
                {loading ? (
                    <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Rejestracja...</span>
                    </div>
                ) : (
                    "Zarejestruj się"
                )}
                </button>
            </form>

            <div className="flex flex-col items-center mt-6">
                <button
                onClick={handleResend}
                disabled={cooldown > 0}
                className={`text-sm font-medium text-amber-700 hover:text-amber-900 transition ${
                    cooldown > 0 ? "opacity-60 cursor-not-allowed" : ""
                }`}
                >
                {cooldown > 0
                    ? `Możesz wysłać ponownie za ${cooldown}s`
                    : "Wyślij ponownie e-mail weryfikacyjny"}
                </button>
            </div>

            <div className="text-sm text-center mt-6 text-amber-800">
                Masz już konto?{" "}
                <Link
                href="/login"
                className="font-semibold text-amber-900 hover:underline"
                >
                Zaloguj się
                </Link>
            </div>
            </div>
        </div>
        </main>
    </div>
  );
}

function InputField({
  label,
  type,
  value,
  onChange,
  placeholder,
}) {
  return (
    <div>
      <label className="text-sm font-medium text-amber-900 mb-1 block">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/90 text-amber-900 border border-amber-300 rounded-xl px-4 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-amber-400 transition"
        required
      />
    </div>
  );
}
