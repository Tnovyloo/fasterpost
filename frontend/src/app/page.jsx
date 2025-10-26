"use client";

import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 via-white to-yellow-50">
      <Header />

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 py-16 md:py-24">
        <div className="max-w-3xl w-full text-center animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-400/20 blur-3xl rounded-full" />
              <img
                src="/file.svg"
                alt="FasterPost Logo"
                className="w-28 h-28 relative z-10 drop-shadow-md"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-blue-800 mb-4 leading-tight">
            FasterPost — Szybciej. Wygodniej. Bezpieczniej.
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
            Nowoczesna platforma do nadawania i odbioru przesyłek — Twoja paczka, Twój wybór.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
            <Link
              href="/login"
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-md hover:shadow-lg"
            >
              Zaloguj się
            </Link>
            <Link
              href="/register"
              className="px-8 py-3 bg-amber-400 text-gray-900 rounded-xl font-semibold hover:bg-amber-500 transition shadow-md hover:shadow-lg"
            >
              Załóż konto
            </Link>
          </div>
        </div>
      </main>

      {/* Info Section (optional marketing style) */}
      <section className="bg-white/70 backdrop-blur-xl border-t border-blue-100 py-12 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          <Feature
            title="⏱️ Ekspresowa wysyłka"
            description="Nadaj paczkę w kilka kliknięć — bez kolejek i zbędnych formalności."
          />
          <Feature
            title="📦 Pełna kontrola"
            description="Śledź przesyłki w czasie rzeczywistym, od nadania do odbioru."
          />
          <Feature
            title="🔒 Bezpieczne transakcje"
            description="Twoje dane i przesyłki są chronione najnowszymi standardami bezpieczeństwa."
          />
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Feature({
  title,
  description,
}) {
  return (
    <div className="p-6 rounded-2xl bg-white/90 border border-blue-100 shadow-sm hover:shadow-md transition">
      <h3 className="text-lg font-semibold text-blue-800 mb-2">{title}</h3>
      <p className="text-gray-700 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
