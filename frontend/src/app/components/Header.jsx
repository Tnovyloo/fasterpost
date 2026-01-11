"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import api from "@/axios/api";
import { Menu, X, Shield, Truck, Briefcase, LogOut } from "lucide-react";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCourier, setIsCourier] = useState(false);
  const [isBusiness, setIsBusiness] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
            const role = roleRes.data.role;
            setIsCourier(role === "courier" || role === "warehouse");
            setIsBusiness(role === "business");
          } catch (err) {
            console.error("Role check failed:", err);
            setIsAdmin(false);
            setIsCourier(false);
            setIsBusiness(false);
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
      setIsCourier(false);
      setIsBusiness(false);
      setMenuOpen(false);
      router.push("/login");
    }
  };

  const isActive = (path) => pathname === path;

  if (loading) {
    return (
      <header className="fixed top-0 left-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 h-[72px] flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full flex justify-between items-center">
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="hidden md:flex gap-4">
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`fixed top-0 left-0 w-full transition-all duration-300 border-b z-100
        ${scrolled || menuOpen ? "bg-white/90 backdrop-blur-xl border-gray-200 shadow-sm py-3" : "bg-white/50 backdrop-blur-md border-transparent py-4"}`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMenuOpen(false)}>
          <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform duration-300">
             <img src="/file.svg" alt="Logo" className="w-6 h-6 brightness-0 invert" />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight group-hover:text-blue-700 transition-colors">
            FasterPost
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/" active={isActive("/")}>Home</NavLink>
          
          {!isLoggedIn ? (
            <>
              <NavLink href="/login" active={isActive("/login")}>Login</NavLink>
              <Link 
                href="/register" 
                className="ml-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              <NavLink href="/user" active={isActive("/user")}>Dashboard</NavLink>
              <NavLink href="/send-package" active={isActive("/send-package")}>Send Package</NavLink>
              
              {isAdmin && (
                <NavLink href="/admin" active={isActive("/admin")} icon={<Shield className="w-4 h-4" />}>
                  Admin
                </NavLink>
              )}
              {isCourier && (
                <NavLink href="/courier/dashboard" active={isActive("/courier/dashboard")} icon={<Truck className="w-4 h-4" />}>
                  Courier
                </NavLink>
              )}
              {isBusiness && (
                <NavLink href="/business/dashboard" active={isActive("/business/dashboard")} icon={<Briefcase className="w-4 h-4" />}>
                  Business
                </NavLink>
              )}

              <div className="w-px h-6 bg-gray-200 mx-2" />
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </>
          )}
        </nav>

        {/* Mobile Toggle */}
        <button 
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
            onClick={() => setMenuOpen(!menuOpen)}
        >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 shadow-xl animate-in slide-in-from-top-2">
            <div className="p-4 flex flex-col gap-2">
                <MobileNavLink href="/" onClick={() => setMenuOpen(false)}>Home</MobileNavLink>
                {!isLoggedIn ? (
                    <>
                        <MobileNavLink href="/login" onClick={() => setMenuOpen(false)}>Login</MobileNavLink>
                        <MobileNavLink href="/register" onClick={() => setMenuOpen(false)} primary>Register</MobileNavLink>
                    </>
                ) : (
                    <>
                        <MobileNavLink href="/user" onClick={() => setMenuOpen(false)}>Dashboard</MobileNavLink>
                        <MobileNavLink href="/send-package" onClick={() => setMenuOpen(false)}>Send Package</MobileNavLink>
                        {isAdmin && <MobileNavLink href="/admin" onClick={() => setMenuOpen(false)}>Admin Panel</MobileNavLink>}
                        {isCourier && <MobileNavLink href="/courier/dashboard" onClick={() => setMenuOpen(false)}>Courier Panel</MobileNavLink>}
                        {isBusiness && <MobileNavLink href="/business/dashboard" onClick={() => setMenuOpen(false)}>Business Panel</MobileNavLink>}
                        <button 
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 text-red-600 font-semibold hover:bg-red-50 rounded-xl transition"
                        >
                            Logout
                        </button>
                    </>
                )}
            </div>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, children, active, icon }) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2
      ${active 
          ? "bg-blue-50 text-blue-700" 
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileNavLink({ href, children, onClick, primary }) {
  return (
    <Link 
        href={href} 
        onClick={onClick}
        className={`px-4 py-3 rounded-xl font-semibold transition-colors
        ${primary 
            ? "bg-blue-600 text-white text-center shadow-md" 
            : "text-gray-700 hover:bg-gray-50"
        }`}
    >
        {children}
    </Link>
  );
}