"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        // TODO: Add login logic here
        setError("");
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-blue-50">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-blue-700 mb-2">Logowanie</h2>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                />
                <input
                    type="password"
                    placeholder="Hasło"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    required
                />
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <button type="submit" className="bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition">Zaloguj się</button>
                <div className="text-sm text-center mt-2">
                    Nie masz konta? <Link href="/register" className="text-blue-600 hover:underline">Zarejestruj się</Link>
                </div>
            </form>
        </main>
    );
}