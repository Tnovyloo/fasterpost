"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/axios/api";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = async () => {
      const saved = localStorage.getItem("isLoggedIn");
      if (!saved) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get("/accounts/user/token-health/");
        if (res.data.valid) {
          setIsLoggedIn(true);
          
          // Check admin status
          try {
            const roleRes = await api.get("/accounts/user/role/");
            setIsAdmin(roleRes.data.is_admin || false);
          } catch (err) {
            console.error("Role check failed:", err);
            setIsAdmin(false);
          }
        } else {
          localStorage.removeItem("isLoggedIn");
          setIsLoggedIn(false);
        }
      } catch (err) {
        console.error("Token health check failed:", err);
        localStorage.removeItem("isLoggedIn");
        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkLoginStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/accounts/user/logout");
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      localStorage.removeItem("isLoggedIn");
      setIsLoggedIn(false);
      setIsAdmin(false);
      setMenuOpen(false);
      router.push("/login");
    }
  };

  if (loading) {
    return (
      <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-white/70 border-b border-blue-100/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/file.svg" alt="FasterPost Logo" className="w-8 h-8 drop-shadow-sm" />
            <span className="text-xl font-bold text-blue-700 tracking-tight">FasterPost</span>
          </Link>
          <div className="h-8 w-24 animate-pulse bg-blue-100 rounded" />
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl bg-white/70 border-b border-blue-100/50 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <img src="/file.svg" alt="FasterPost Logo" className="w-8 h-8 drop-shadow-sm" />
          <span className="text-xl font-bold text-blue-700 tracking-tight">FasterPost</span>
        </Link>

        <nav className="hidden md:flex gap-6 text-blue-800 font-medium">
          <NavLink href="/">Home</NavLink>
          {!isLoggedIn ? (
            <>
              <NavLink href="/login">Login</NavLink>
              <NavLink href="/register">Register</NavLink>
              <NavLink href="/login">Send package</NavLink>
            </>
          ) : (
            <>
              <NavLink href="/user">Account</NavLink>
              <NavLink href="/send-package">Send package</NavLink>
              <NavLink href="/user/settings">Settings</NavLink>
              {isAdmin && (
                <>
                  <NavLink href="/admin">Admin</NavLink>
                </>
              )}
              <button
                onClick={handleLogout}
                className="text-blue-700 hover:text-blue-900 font-medium transition"
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="relative group transition"
    >
      <span className="group-hover:text-blue-600 transition">{children}</span>
      <span className="absolute left-0 bottom-0 w-0 h-[2px] bg-blue-600 transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}