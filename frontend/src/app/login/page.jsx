"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import api from "@/axios/api";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await api.post("/accounts/user/login", {
        email: email.trim(),
        password: password,
      });

      localStorage.setItem("isLoggedIn", "true");

      console.log("Zalogowano!", data);
      router.push("/");
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Nie udało się zalogować.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div>
      <Header />
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-blue-200 p-6">
        <div className="w-full max-w-md animate-fade-in">
          <div className="backdrop-blur-xl bg-white/60 border border-blue-200/50 rounded-2xl shadow-2xl p-8">
            <h1 className="text-3xl font-semibold text-center text-blue-900 mb-6">
              Witaj ponownie 👋
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="text-sm font-medium text-blue-900 mb-1 block">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="adres@email.com"
                  className="w-full bg-white/90 text-blue-900 border border-blue-300 rounded-xl px-4 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-400 transition"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-blue-900 mb-1 block">
                  Hasło
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/90 text-blue-900 border border-blue-300 rounded-xl px-4 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-400 transition"
                  required
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center animate-fade-in">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`bg-blue-600 text-white py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center ${
                  loading ? "opacity-80 cursor-wait" : ""
                }`}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>Logowanie...</span>
                  </div>
                ) : (
                  "Zaloguj się"
                )}
              </button>
            </form>

            <div className="text-sm text-center mt-4 text-blue-800">
              Nie masz konta?{" "}
              <Link
                href="/register"
                className="font-semibold text-blue-900 hover:underline"
              >
                Zarejestruj się
              </Link>
            </div>

            <div className="text-sm text-center mt-4 text-blue-800">
              Zapomniałes hasła?{" "}
              <Link
                href="/password-reset"
                className="font-semibold text-blue-900 hover:underline"
              >
                Kliknij tutaj
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
