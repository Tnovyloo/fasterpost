"use client";
import { useState } from "react";
import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function Page() {
    return (
        <div>    
            <Header/>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 flex flex-col items-center justify-center p-4">
                <div className="max-w-xl w-full bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
                    <img src="/file.svg" alt="FasterPost Logo" className="w-24 h-24 mb-4" />
                    <h1 className="text-4xl font-bold text-blue-700 mb-2">FasterPost</h1>
                    <p className="text-lg text-gray-700 mb-6 text-center">
                        Nowoczesna platforma do nadawania i odbioru przesyłek – szybciej, wygodniej, bezpieczniej. Twoja paczka, Twój wybór!
                    </p>
                    <div className="flex gap-4">
                        <Link href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition">Zaloguj się</Link>
                        <Link href="/register" className="px-6 py-2 bg-yellow-400 text-gray-900 rounded-lg font-semibold hover:bg-yellow-500 transition">Załóż konto</Link>
                    </div>
                </div>
            </div>
            <Footer/>
        </div>
    );
}