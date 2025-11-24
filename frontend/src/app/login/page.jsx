"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "../components/Header";
import api from "@/axios/api";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [require2FA, setRequire2FA] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = require2FA
        ? { email, password, code: totpCode }
        : { email, password };

      const res = await api.post("/accounts/user/login", payload);

      // If 206 returned, require 2FA
      if (res.status === 206 || res.data?.require_2fa) {
        setRequire2FA(true);
        setError(res.data?.message || "TOTP code required");
      } else {
        // success login
        localStorage.setItem("isLoggedIn", "true");
        router.push("/user");
      }
    } catch (err) {
      if (err.response?.status === 206 && err.response?.data?.require_2fa) {
        setRequire2FA(true);
        setError(err.response.data.message || "TOTP code required");
      } else {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.detail ||
          err.message ||
          "Can't login.";
        setError(msg);
      }
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
              Welcome back 👋
            </h1>

            <form onSubmit={handleLogin} className="flex flex-col gap-5">
              {!require2FA && (
                <>
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
                      Password
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
                </>
              )}

              {require2FA && (
                <div>
                  <label className="text-sm font-medium text-blue-900 mb-1 block">
                    TOTP Code
                  </label>
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) =>
                      setTotpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
                    }
                    placeholder="123456"
                    className="w-full bg-white/90 text-blue-900 border border-blue-300 rounded-xl px-4 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-blue-400 transition"
                    required
                  />
                </div>
              )}

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
                    <span>{require2FA ? "Verifying..." : "Logging in..."}</span>
                  </div>
                ) : require2FA ? (
                  "Verify TOTP"
                ) : (
                  "Login in"
                )}
              </button>
            </form>

            <div className="text-sm font-medium text-blue-900 mb-1 block mt-3 text-justify mx-auto">
              Forgot password? you could <Link href={"/password-reset"} className="font-bold">Reset it</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
