"use client";

import { useEffect, useState } from "react";
import api from "@/axios/api";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import InputField from "@/app/components/InputField";
import { User, Phone, UserCircle } from "lucide-react"; // icons (optional)

export default function UserProfilePage() {
    const [user, setUser] = useState(null);
    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        username: "",
        phone_number: "",
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Messages
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // Fetch user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get("/accounts/user/me/");
                setUser(res.data);
                setForm({
                    first_name: res.data.first_name || "",
                    last_name: res.data.last_name || "",
                    username: res.data.username || "",
                    phone_number: res.data.phone_number || "",
                });
            } catch (err) {
                setError("Nie udało się pobrać danych użytkownika. Spróbuj ponownie.");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setSaving(true);

        try {
            const res = await api.patch("/accounts/user/me/", form);
            setSuccess("Dane zostały zaktualizowane pomyślnie!");
            setUser(res.data);
        } catch (err) {
            if (err.response?.data) {
                const messages = Object.values(err.response.data).flat().join(" ");
                setError(messages || "Wystąpił błąd aktualizacji.");
            } else {
                setError("Serwer nie odpowiada. Spróbuj ponownie później.");
            }
        } finally {
            setSaving(false);
        }
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50 flex items-center justify-center">
                <div className="animate-pulse space-y-4 w-80">
                    <div className="h-6 bg-blue-100 rounded-lg"></div>
                    <div className="h-6 bg-blue-100 rounded-lg"></div>
                    <div className="h-6 bg-blue-100 rounded-lg"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
            <Header />

            <main className="flex-1 px-6 py-10 pt-28 max-w-3xl mx-auto w-full">

                <div className="mb-6 flex items-center gap-3">
                    <UserCircle className="text-blue-700 w-10 h-10" />
                    <h1 className="text-3xl font-bold text-blue-900 tracking-tight">
                        Twój profil
                    </h1>
                </div>

                {/* Error / Success messages */}
                {error && (
                    <div className="mb-4 p-4 rounded-xl bg-red-50 text-red-700 border border-red-200 shadow-sm">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-4 p-4 rounded-xl bg-green-50 text-green-700 border border-green-200 shadow-sm">
                        {success}
                    </div>
                )}

                {/* Profile card */}
                <form
                    onSubmit={handleUpdate}
                    className="bg-white/80 shadow-xl rounded-2xl p-8 space-y-6 border border-blue-100 backdrop-blur-sm"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField
                            icon={<User className="w-4 h-4 text-blue-500" />}
                            label="Imię"
                            name="first_name"
                            value={form.first_name}
                            onChange={handleChange}
                        />
                        <InputField
                            icon={<User className="w-4 h-4 text-blue-500" />}
                            label="Nazwisko"
                            name="last_name"
                            value={form.last_name}
                            onChange={handleChange}
                        />
                    </div>

                    <InputField
                        icon={<User className="w-4 h-4 text-blue-500" />}
                        label="Nazwa użytkownika"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                    />

                    <InputField
                        icon={<Phone className="w-4 h-4 text-blue-500" />}
                        label="Numer telefonu"
                        name="phone_number"
                        value={form.phone_number}
                        onChange={handleChange}
                    />

                    <button
                        type="submit"
                        disabled={saving}
                        className={`w-full py-3 rounded-xl font-semibold transition shadow-md text-white text-lg
                            ${saving ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
                        `}
                    >
                        {saving ? "Zapisywanie…" : "Zapisz zmiany"}
                    </button>
                </form>
            </main>

            <Footer />
        </div>
    );
}
