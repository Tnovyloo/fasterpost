"use client";

import React, { useState } from "react";
import api from "@/axios/api";

export default function TOTPPage() {
  const [loading, setLoading] = useState(false);
  const [qrBase64, setQrBase64] = useState(null);
  const [secret, setSecret] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [code, setCode] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);

  const endpoints = {
    enable: "/user/totp/enable",
    verify: "/user/totp/verify",
    disable: "/user/totp/disable",
  };

  async function send(path, method = "POST", body = null) {
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      const res = await api.request({
        url: path,
        method,
        data: body || undefined,
        withCredentials: true,
      });
      return res.data;
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.response?.data?.detail ||
        (typeof e.response?.data === "string"
          ? e.response.data
          : JSON.stringify(e.response?.data)) ||
        e.message;
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleEnable() {
    setQrBase64(null);
    setSecret(null);
    const data = await send(endpoints.enable, "POST", {});
    if (!data) return;
    setQrBase64(data.qr_image_base64 || null);
    setSecret(data.secret || null);
    setIsEnabled(false);
    setStatus("Scan the QR or copy the secret, then verify the code.");
  }

  async function handleVerify() {
    if (!code) return setError("Enter the 6‑digit code.");
    const data = await send(endpoints.verify, "POST", { code });
    if (!data) return;
    if (data.status) {
      setStatus(data.status);
      setIsEnabled(true);
      setQrBase64(null);
      setSecret(null);
      setCode("");
    }
  }

  async function handleDisable() {
    const data = await send(endpoints.disable, "POST", {});
    if (!data) return;
    setStatus(data.status || "TOTP disabled");
    setIsEnabled(false);
  }

  function copySecret() {
    if (!secret) return;
    navigator.clipboard.writeText(secret).then(() => setStatus("Copied!"));
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6 pt-24">
      <main className="max-w-3xl mx-auto w-full space-y-8">
        <h1 className="text-3xl font-bold text-blue-900 tracking-tight">🔐 Two‑Factor Authentication</h1>

        {status && <div className="p-3 rounded-xl bg-green-100 text-green-700 border border-green-300">{status}</div>}
        {error && <div className="p-3 rounded-xl bg-red-100 text-red-700 border border-red-300">{error}</div>}

        <div className="grid md:grid-cols-2 gap-8">
          {/* LEFT */}
          <div className="bg-white shadow p-6 rounded-2xl border space-y-5">
            <h2 className="text-xl font-semibold text-black">Provision TOTP</h2>
            <p className="text-sm text-gray-700">Generate a QR code and secret for your authenticator app.</p>

            <button
              onClick={handleEnable}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold shadow"
            >
              {loading ? "Working..." : "Generate QR & Secret"}
            </button>

            {qrBase64 && (
              <div className="space-y-4 mt-4">
                <img
                  src={`data:image/png;base64,${qrBase64}`}
                  alt="QR"
                  className="w-40 h-40 border p-2 rounded-xl bg-white mx-auto"
                />

                {secret && (
                  <div className="flex items-center justify-between bg-gray-50 p-3 border rounded-xl">
                    <code className="text-black">{secret}</code>
                    <button onClick={copySecret} className="px-3 py-1 rounded-xl border">Copy</button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="bg-white shadow p-6 rounded-2xl border space-y-5">
            <h2 className="text-xl font-semibold text-black">Verify Code</h2>
            <p className="text-sm text-gray-700">Enter the 6‑digit code from your authenticator app.</p>

            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full border rounded-xl p-3 text-black"
            />

            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl font-semibold shadow"
            >
              Verify
            </button>

            <div className="pt-4 border-t">
              <h2 className="text-xl font-semibold text-black mb-2">Disable TOTP</h2>
              <button
                onClick={handleDisable}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl font-semibold shadow"
              >
                Disable
              </button>
              <p className="text-sm text-gray-600 mt-2">Status: {isEnabled ? "Enabled" : "Not enabled"}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
