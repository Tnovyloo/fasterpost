"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, CreditCard, Warehouse, LogOut, PlusCircle } from "lucide-react";
import Header from "@/app/components/Header";

export default function BusinessLayout({ children }) {
  const pathname = usePathname();

  const menuItems = [
    {
      title: "Dashboard",
      href: "/business/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      title: "Create Package",
      href: "/business/packages/create",
      icon: <PlusCircle className="w-5 h-5" />,
    },
    {
      title: "My Packages",
      href: "/business/packages",
      icon: <Package className="w-5 h-5" />,
    },
    {
      title: "Magazines",
      href: "/business/magazines",
      icon: <Warehouse className="w-5 h-5" />,
    },
    {
      title: "Payments",
      href: "/business/payments",
      icon: <CreditCard className="w-5 h-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-20">
      <Header />
      <div className="flex max-w-7xl mx-auto px-4 py-8 gap-8">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border p-4 sticky top-24">
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isActive ? "bg-indigo-50 text-indigo-600 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"}`}>
                    {item.icon}
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}