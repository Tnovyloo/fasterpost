"use client";

import Link from "next/link";

export default function Header() {
    return (
        <header className="w-full bg-white shadow-md py-4 px-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <img src="/file.svg" alt="FasterPost Logo" className="w-8 h-8" />
                <span className="text-xl font-bold text-blue-700">FasterPost</span>
            </div>
            <nav className="flex gap-4">
                <Link href="/" className="text-blue-700 hover:underline font-medium">Strona główna</Link>
                <Link href="/login" className="text-blue-700 hover:underline font-medium">Logowanie</Link>
                <Link href="/register" className="text-blue-700 hover:underline font-medium">Rejestracja</Link>
            </nav>
        </header>
    );
}