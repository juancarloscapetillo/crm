"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Menu, LogOut, UserCircle } from "lucide-react";
import GlobalSearch from "./GlobalSearch";
import Sidebar from "./Sidebar";

export default function Topbar({ userName, role }: { userName: string; role: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4">
        <button className="lg:hidden text-gray-500" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
          <Menu size={22} />
        </button>
        <div className="flex-1 flex justify-center lg:justify-start">
          <GlobalSearch />
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <UserCircle size={22} className="text-calume-navy" />
          <div className="hidden sm:block leading-tight">
            <div className="font-medium">{userName}</div>
            <div className="text-xs text-gray-400">{role === "ADMIN" ? "Administrador" : "Vendedor"}</div>
          </div>
          <button
            className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Cerrar sesión"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
