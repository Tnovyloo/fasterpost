"use client";

import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Hasła muszą być takie same.");
            return;
        }
        // TODO: Add registration logic here
        setError("");
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-yellow-50">
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-yellow-600 mb-2">Rejestracja</h2>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    required
                />
                <input
                    type="password"
                    placeholder="Hasło"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    required
                />
                <input
                    type="password"
                    placeholder="Powtórz hasło"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    required
                />
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <button type="submit" className="bg-yellow-400 text-gray-900 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition">Zarejestruj się</button>
                <div className="text-sm text-center mt-2">
                    Masz już konto? <Link href="/login" className="text-yellow-600 hover:underline">Zaloguj się</Link>
                </div>
            </form>
        </main>
    );
}
