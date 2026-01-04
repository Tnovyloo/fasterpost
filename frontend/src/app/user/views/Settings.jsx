"use client";

import React, { useState, useEffect } from "react";
import api from "@/axios/api";

export default function SettingsView() {
  // PROFILE STATE
  // Initialize with empty strings to avoid uncontrolled input warnings
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
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // TOTP STATE
  const [totpLoading, setTotpLoading] = useState(false);
  const [qrBase64, setQrBase64] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [totpMsg, setTotpMsg] = useState({ type: '', text: '' });

  const endpoints = {
    profile: "accounts/user/",
    updateProfile: "accounts/user/",
    enableTotp: "accounts/user/totp/enable",
    verifyTotp: "accounts/user/totp/verify",
    disableTotp: "accounts/user/totp/disable",
    statusTotp: "accounts/user/totp/status",
  };

  useEffect(() => {
    fetchUserProfile();
    fetchTOTPStatus();
  }, []);

  // --- PROFILE LOGIC ---
  async function fetchUserProfile() {
    setProfileLoading(true);
    try {
      const res = await api.get(endpoints.profile);
      // Ensure we never set null values into state that feeds inputs
      setUserInfo({
        first_name: res.data.first_name || "",
        last_name: res.data.last_name || "",
        username: res.data.username || "",
        phone_number: res.data.phone_number || "",
        email: res.data.email || "",
        role: res.data.role || ""
      });
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleUpdateProfile() {
    setProfileMsg({ type: '', text: '' });
    setProfileLoading(true);
    try {
      await api.put(endpoints.updateProfile, {
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        username: userInfo.username,
        phone_number: userInfo.phone_number
      });
      setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
      setEditMode(false);
      await fetchUserProfile();
    } catch (e) {
      setProfileMsg({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setProfileLoading(false);
    }
  }

  // --- TOTP LOGIC ---
  async function fetchTOTPStatus() {
    try {
      const res = await api.get(endpoints.statusTotp);
      setIsEnabled(res.data.enabled);
    } catch (e) { console.error(e); }
  }

  async function handleEnableTotp() {
    setQrBase64(null); setSecret(null); setTotpLoading(true);
    try {
      const res = await api.post(endpoints.enableTotp, {});
      setQrBase64(res.data.qr_image_base64);
      setSecret(res.data.secret);
      setIsEnabled(false);
    } catch(e) { setTotpMsg({ type: 'error', text: 'Failed to generate QR.' }); }
    finally { setTotpLoading(false); }
  }

  async function handleVerifyTotp() {
    if (!code) return;
    setTotpLoading(true);
    try {
      const res = await api.post(endpoints.verifyTotp, { code });
      if (res.data.status) {
        setIsEnabled(true);
        setQrBase64(null);
        setSecret(null);
        setCode("");
        setTotpMsg({ type: 'success', text: 'Two-Factor Authentication Enabled!' });
      }
    } catch(e) {
        setTotpMsg({ type: 'error', text: 'Invalid code. Try again.' });
    } finally { setTotpLoading(false); }
  }

  async function handleDisableTotp() {
    if(!confirm("Disable 2FA? Your account will be less secure.")) return;
    setTotpLoading(true);
    try {
      await api.post(endpoints.disableTotp, {});
      setIsEnabled(false);
      setTotpMsg({ type: 'success', text: '2FA Disabled.' });
    } catch(e) { setTotpMsg({ type: 'error', text: 'Could not disable 2FA.' }); }
    finally { setTotpLoading(false); }
  }

  return (
    <div className="space-y-10">
      
      {/* 1. PROFILE CARD */}
      <section>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Personal Information</h2>
            {!editMode && (
                <button onClick={() => setEditMode(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition">
                    Edit Details
                </button>
            )}
        </div>

        {profileMsg.text && (
            <div className={`p-4 mb-4 rounded-xl ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {profileMsg.text}
            </div>
        )}

        <div className="bg-white/80 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">First Name</label>
                    {editMode ? (
                        <input 
                            value={userInfo.first_name} 
                            onChange={e => setUserInfo({...userInfo, first_name: e.target.value})} 
                            className="w-full p-2 border rounded-lg" 
                        />
                    ) : (
                        <p className="text-gray-900 font-medium">{userInfo.first_name || "—"}</p>
                    )}
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Last Name</label>
                    {editMode ? (
                        <input 
                            value={userInfo.last_name} 
                            onChange={e => setUserInfo({...userInfo, last_name: e.target.value})} 
                            className="w-full p-2 border rounded-lg" 
                        />
                    ) : (
                        <p className="text-gray-900 font-medium">{userInfo.last_name || "—"}</p>
                    )}
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Username</label>
                     {editMode ? (
                        <input 
                            value={userInfo.username} 
                            onChange={e => setUserInfo({...userInfo, username: e.target.value})} 
                            className="w-full p-2 border rounded-lg" 
                        />
                    ) : (
                        <p className="text-gray-900 font-medium">{userInfo.username || "—"}</p>
                    )}
                </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Phone</label>
                    {editMode ? (
                        <input 
                            value={userInfo.phone_number} 
                            onChange={e => setUserInfo({...userInfo, phone_number: e.target.value})} 
                            className="w-full p-2 border rounded-lg" 
                        />
                    ) : (
                        <p className="text-gray-900 font-medium">{userInfo.phone_number || "—"}</p>
                    )}
                </div>
                <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">Email (Read Only)</label>
                    <p className="text-gray-700 font-mono bg-gray-50 p-2 rounded-lg border border-gray-100">{userInfo.email}</p>
                </div>
            </div>

            {editMode && (
                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button onClick={handleUpdateProfile} disabled={profileLoading} className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Save Changes</button>
                    <button onClick={() => { setEditMode(false); fetchUserProfile(); }} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">Cancel</button>
                </div>
            )}
        </div>
      </section>

      {/* 2. SECURITY CARD (TOTP) */}
      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Security & 2FA</h2>
        
        {totpMsg.text && (
            <div className={`p-4 mb-4 rounded-xl ${totpMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {totpMsg.text}
            </div>
        )}

        <div className="bg-white/80 rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Authenticator App</h3>
                    <p className="text-sm text-gray-500">Secure your account with Google Authenticator or similar.</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {isEnabled ? "ENABLED" : "DISABLED"}
                </span>
            </div>

            {!isEnabled && !qrBase64 && (
                <button onClick={handleEnableTotp} disabled={totpLoading} className="w-full py-3 bg-blue-50 text-blue-700 border border-blue-100 rounded-xl font-bold hover:bg-blue-100 transition">
                    Setup 2FA Now
                </button>
            )}

            {/* SETUP FLOW */}
            {qrBase64 && (
                <div className="flex flex-col md:flex-row gap-8 items-start bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                    <div className="bg-white p-2 rounded-lg border shadow-sm">
                        <img src={`data:image/png;base64,${qrBase64}`} alt="QR Code" className="w-40 h-40" />
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <p className="text-sm font-bold text-gray-700 mb-1">1. Scan QR Code</p>
                            <p className="text-xs text-gray-500">Open your authenticator app and scan the image.</p>
                        </div>
                        <div>
                            <p className="text-sm font-bold text-gray-700 mb-1">2. Verify Code</p>
                            <div className="flex gap-2">
                                <input 
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    placeholder="000 000"
                                    className="w-32 p-2 border rounded-lg text-center font-mono text-lg tracking-widest"
                                    maxLength={6}
                                />
                                <button onClick={handleVerifyTotp} disabled={totpLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">
                                    Verify
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isEnabled && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                    <button onClick={handleDisableTotp} className="text-red-600 font-bold text-sm hover:underline">
                        Disable Two-Factor Authentication
                    </button>
                </div>
            )}
        </div>
      </section>

    </div>
  );
}