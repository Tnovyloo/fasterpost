// "use client";

// import React, { useState, useEffect } from "react";
// import api from "@/axios/api";
// import Header from "@/app/components/Header";

// export default function TOTPPage() {
//   const [loading, setLoading] = useState(false);
//   const [qrBase64, setQrBase64] = useState(null);
//   const [secret, setSecret] = useState(null);
//   const [status, setStatus] = useState(null);
//   const [error, setError] = useState(null);
//   const [code, setCode] = useState("");
//   const [isEnabled, setIsEnabled] = useState(false);

//   const endpoints = {
//     enable: "accounts/user/totp/enable",
//     verify: "accounts/user/totp/verify",
//     disable: "accounts/user/totp/disable",
//     status: "accounts/user/totp/status",
//   };

//   // Fetch TOTP status on page load
//   useEffect(() => {
//     async function fetchStatus() {
//       setError(null);
//       setLoading(true);
//       try {
//         const res = await api.get(endpoints.status, { withCredentials: true });
//         setIsEnabled(res.data.enabled); // { enabled: true/false }
//       } catch (e) {
//         const msg =
//           e.response?.data?.error ||
//           e.response?.data?.detail ||
//           (typeof e.response?.data === "string" ? e.response.data : JSON.stringify(e.response?.data)) ||
//           e.message;
//         setError(msg); // show error in red panel
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchStatus();
//   }, []);

//   async function send(path, body = {}) {
//     setError(null);
//     setStatus(null);
//     setLoading(true);
//     try {
//       const res = await api.post(path, body, { withCredentials: true });
//       return res.data;
//     } catch (e) {
//       const msg =
//         e.response?.data?.error ||
//         e.response?.data?.detail ||
//         (typeof e.response?.data === "string" ? e.response.data : JSON.stringify(e.response?.data)) ||
//         e.message;
//       setError(msg);
//       return null;
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function handleEnable() {
//     setQrBase64(null);
//     setSecret(null);
//     const data = await send(endpoints.enable, {});
//     if (!data) return;
//     setQrBase64(data.qr_image_base64 || null);
//     setSecret(data.secret || null);
//     setIsEnabled(false);
//     setStatus("Scan the QR or copy the secret, then verify the code.");
//   }

//   async function handleVerify() {
//     if (!code) return setError("Enter the 6‑digit code.");
//     const data = await send(endpoints.verify, { code });
//     if (!data) return;
//     if (data.status) {
//       setStatus(data.status);
//       setIsEnabled(true);
//       setQrBase64(null);
//       setSecret(null);
//       setCode("");
//     }
//   }

//   async function handleDisable() {
//     const data = await send(endpoints.disable, {});
//     if (!data) return;
//     setStatus(data.status || "TOTP disabled");
//     setIsEnabled(false);
//   }

//   function copySecret() {
//     if (!secret) return;
//     navigator.clipboard.writeText(secret).then(() => setStatus("Copied!"));
//   }

//   return (
//     <>
//       <Header />
//       <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6 pt-24">
//         <main className="max-w-3xl mx-auto w-full space-y-8">
//           <h1 className="text-3xl font-bold text-blue-900 tracking-tight">🔐 Two‑Factor Authentication</h1>

//           {status && (
//             <div className="p-3 rounded-xl bg-green-100 text-green-700 border border-green-300">{status}</div>
//           )}
//           {error && (
//             <div className="p-3 rounded-xl bg-red-100 text-red-700 border border-red-300">{error}</div>
//           )}

//           <div className="grid md:grid-cols-2 gap-8">
//             <div className="bg-white shadow p-6 rounded-2xl border space-y-5">
//               <h2 className="text-xl font-semibold text-black">Provision TOTP</h2>
//               <p className="text-sm text-gray-700">Generate a QR code and secret for your authenticator app.</p>

//               <button
//                 onClick={handleEnable}
//                 disabled={loading}
//                 className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold shadow"
//               >
//                 {loading ? "Working..." : "Generate QR & Secret"}
//               </button>

//               {qrBase64 && (
//                 <div className="space-y-4 mt-4">
//                   <img
//                     src={`data:image/png;base64,${qrBase64}`}
//                     alt="QR"
//                     className="w-40 h-40 border p-2 rounded-xl bg-white mx-auto"
//                   />

//                   {secret && (
//                     <div className="flex items-center justify-between bg-gray-50 p-3 border rounded-xl">
//                       <code className="text-black">{secret}</code>
//                       <button onClick={copySecret} className="px-3 py-1 rounded-xl border">Copy</button>
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>

//             <div className="bg-white shadow p-6 rounded-2xl border space-y-5">
//               <h2 className="text-xl font-semibold text-black">Verify Code</h2>
//               <p className="text-sm text-gray-700">Enter the 6‑digit code from your authenticator app.</p>

//               <input
//                 value={code}
//                 onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
//                 placeholder="123456"
//                 className="w-full border rounded-xl p-3 text-black"
//               />

//               <button
//                 onClick={handleVerify}
//                 disabled={loading}
//                 className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl font-semibold shadow"
//               >
//                 Verify
//               </button>

//               <div className="pt-4 border-t">
//                 <h2 className="text-xl font-semibold text-black mb-2">Disable TOTP</h2>
//                 <button
//                   onClick={handleDisable}
//                   disabled={loading}
//                   className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl font-semibold shadow"
//                 >
//                   Disable
//                 </button>
//                 <p className="text-sm text-gray-600 mt-2">
//                   Status: {isEnabled ? "Enabled" : "Not enabled"}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </main>
//       </div>
//     </>
//   );
// }


"use client";

import React, { useState, useEffect } from "react";
import api from "@/axios/api";
import Header from "@/app/components/Header";

export default function ProfilePage() {
  const [loading, setLoading] = useState(false);
  const [qrBase64, setQrBase64] = useState(null);
  const [secret, setSecret] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [code, setCode] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);

  // User profile state
  const [userInfo, setUserInfo] = useState({
    first_name: "",
    last_name: "",
    username: "",
    phone_number: "",
    email: "",
    role: ""
  });
  const [editMode, setEditMode] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const endpoints = {
    enable: "accounts/user/totp/enable",
    verify: "accounts/user/totp/verify",
    disable: "accounts/user/totp/disable",
    status: "accounts/user/totp/status",
    profile: "accounts/user/",
    updateProfile: "accounts/user/",
  };

  // Fetch user profile and TOTP status on page load
  useEffect(() => {
    fetchUserProfile();
    fetchTOTPStatus();
  }, []);

  async function fetchUserProfile() {
    setProfileLoading(true);
    try {
      const res = await api.get(endpoints.profile, { withCredentials: true });
      setUserInfo({
        first_name: res.data.first_name || "",
        last_name: res.data.last_name || "",
        username: res.data.username || "",
        phone_number: res.data.phone_number || "",
        email: res.data.email || "",
        role: res.data.role || ""
      });
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.response?.data?.detail ||
        (typeof e.response?.data === "string" ? e.response.data : JSON.stringify(e.response?.data)) ||
        e.message;
      setError(msg);
    } finally {
      setProfileLoading(false);
    }
  }

  async function fetchTOTPStatus() {
    try {
      const res = await api.get(endpoints.status, { withCredentials: true });
      setIsEnabled(res.data.enabled);
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.response?.data?.detail ||
        (typeof e.response?.data === "string" ? e.response.data : JSON.stringify(e.response?.data)) ||
        e.message;
      setError(msg);
    }
  }

  async function handleUpdateProfile() {
    setError(null);
    setStatus(null);
    setProfileLoading(true);
    try {
      const res = await api.put(endpoints.updateProfile, {
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        username: userInfo.username,
        phone_number: userInfo.phone_number
      }, { withCredentials: true });
      
      setStatus("Profile updated successfully!");
      setEditMode(false);
      await fetchUserProfile();
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.response?.data?.detail ||
        (typeof e.response?.data === "string" ? e.response.data : JSON.stringify(e.response?.data)) ||
        e.message;
      setError(msg);
    } finally {
      setProfileLoading(false);
    }
  }

  function handleInputChange(field, value) {
    setUserInfo(prev => ({ ...prev, [field]: value }));
  }

  async function send(path, body = {}) {
    setError(null);
    setStatus(null);
    setLoading(true);
    try {
      const res = await api.post(path, body, { withCredentials: true });
      return res.data;
    } catch (e) {
      const msg =
        e.response?.data?.error ||
        e.response?.data?.detail ||
        (typeof e.response?.data === "string" ? e.response.data : JSON.stringify(e.response?.data)) ||
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
    const data = await send(endpoints.enable, {});
    if (!data) return;
    setQrBase64(data.qr_image_base64 || null);
    setSecret(data.secret || null);
    setIsEnabled(false);
    setStatus("Scan the QR or copy the secret, then verify the code.");
  }

  async function handleVerify() {
    if (!code) return setError("Enter the 6‑digit code.");
    const data = await send(endpoints.verify, { code });
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
    const data = await send(endpoints.disable, {});
    if (!data) return;
    setStatus(data.status || "TOTP disabled");
    setIsEnabled(false);
  }

  function copySecret() {
    if (!secret) return;
    navigator.clipboard.writeText(secret).then(() => setStatus("Copied!"));
  }

  return (
    <>
      <Header />
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-yellow-50 p-6 pt-24">
        <main className="max-w-6xl mx-auto w-full space-y-8">
          <h1 className="text-3xl font-bold text-blue-900 tracking-tight">👤 Profile & Security</h1>

          {status && (
            <div className="p-3 rounded-xl bg-green-100 text-green-700 border border-green-300">{status}</div>
          )}
          {error && (
            <div className="p-3 rounded-xl bg-red-100 text-red-700 border border-red-300">{error}</div>
          )}

          {/* User Profile Section */}
          <div className="bg-white shadow p-6 rounded-2xl border space-y-5">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-black">Personal Information</h2>
              {!editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow"
                >
                  Edit Profile
                </button>
              )}
            </div>

            {profileLoading ? (
              <p className="text-gray-600">Loading profile...</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={userInfo.first_name}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      className="w-full border rounded-xl p-3 text-black"
                      placeholder="Enter first name"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded-xl text-black">{userInfo.first_name || "Not set"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={userInfo.last_name}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      className="w-full border rounded-xl p-3 text-black"
                      placeholder="Enter last name"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded-xl text-black">{userInfo.last_name || "Not set"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={userInfo.username}
                      onChange={(e) => handleInputChange("username", e.target.value)}
                      className="w-full border rounded-xl p-3 text-black"
                      placeholder="Enter username"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded-xl text-black">{userInfo.username || "Not set"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={userInfo.phone_number}
                      onChange={(e) => handleInputChange("phone_number", e.target.value)}
                      className="w-full border rounded-xl p-3 text-black"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="p-3 bg-gray-50 rounded-xl text-black">{userInfo.phone_number || "Not set"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <p className="p-3 bg-gray-100 rounded-xl text-gray-600">{userInfo.email}</p>
                  <span className="text-xs text-gray-500">Email cannot be changed</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <p className="p-3 bg-gray-100 rounded-xl text-gray-600 capitalize">{userInfo.role}</p>
                </div>
              </div>
            )}

            {editMode && (
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleUpdateProfile}
                  disabled={profileLoading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow"
                >
                  {profileLoading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    fetchUserProfile();
                  }}
                  disabled={profileLoading}
                  className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-semibold shadow"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* TOTP Section */}
          <h2 className="text-2xl font-bold text-blue-900 tracking-tight">🔐 Two‑Factor Authentication</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white shadow p-6 rounded-2xl border space-y-5">
              <h3 className="text-xl font-semibold text-black">Provision TOTP</h3>
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
                      <code className="text-black text-sm break-all">{secret}</code>
                      <button onClick={copySecret} className="px-3 py-1 rounded-xl border ml-2 text-sm whitespace-nowrap">
                        Copy
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white shadow p-6 rounded-2xl border space-y-5">
              <h3 className="text-xl font-semibold text-black">Verify Code</h3>
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
                <h3 className="text-xl font-semibold text-black mb-2">Disable TOTP</h3>
                <button
                  onClick={handleDisable}
                  disabled={loading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-xl font-semibold shadow"
                >
                  Disable
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  Status: <span className={isEnabled ? "text-green-600 font-semibold" : "text-gray-500"}>
                    {isEnabled ? "Enabled ✓" : "Not enabled"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}