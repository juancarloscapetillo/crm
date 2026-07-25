"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Kanban,
  ListChecks,
  UserCog,
  Megaphone,
  Settings,
  X,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/tareas", label: "Tareas y seguimientos", icon: ListChecks },
  { href: "/asesores", label: "Asesores", icon: UserCog },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

const STORAGE_KEY = "calume-sidebar-collapsed";

export default function Sidebar({
  onNavigate,
  forceExpanded = false,
}: {
  onNavigate?: () => void;
  forceExpanded?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (forceExpanded) return;
    if (localStorage.getItem(STORAGE_KEY) === "true") setCollapsed(true);
  }, [forceExpanded]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  const isCollapsed = !forceExpanded && collapsed;

  return (
    <div className={`flex flex-col h-full bg-calume-navy text-white transition-all duration-200 ${isCollapsed ? "w-[72px]" : "w-64"}`}>
      <div className={`flex items-center border-b border-white/10 ${isCollapsed ? "justify-center px-2 py-5" : "justify-between px-4 py-5"}`}>
        <Link href="/" onClick={onNavigate} className="opacity-100 hover:opacity-80 transition-opacity" aria-label="Ir al Dashboard">
          {isCollapsed ? (
            <Image src="/brand/calume-icon.png" alt="Calume Desarrollos" width={36} height={36} priority />
          ) : (
            <Image src="/brand/calume-logo.png" alt="Calume Desarrollos" width={168} height={42} priority />
          )}
        </Link>
        {!isCollapsed && (
          <button className="lg:hidden text-white/70" onClick={onNavigate} aria-label="Cerrar menú">
            <X size={20} />
          </button>
        )}
      </div>
      <nav className={`flex-1 overflow-y-auto py-4 space-y-1 ${isCollapsed ? "px-2" : "px-2"}`}>
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isCollapsed ? "justify-center" : ""
              } ${active ? "bg-calume-gold text-calume-navy" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon size={18} />
              {!isCollapsed && item.label}
            </Link>
          );
        })}
      </nav>
      {!forceExpanded && (
        <button
          onClick={toggleCollapsed}
          className="hidden lg:flex items-center gap-2 px-4 py-3 text-white/60 hover:text-white hover:bg-white/10 border-t border-white/10 text-xs"
        >
          {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          {!isCollapsed && "Ocultar menú"}
        </button>
      )}
      {!isCollapsed && (
        <div className="px-4 py-4 border-t border-white/10 text-[11px] text-white/50">
          Calume CRM · Prototipo v1.0
        </div>
      )}
    </div>
  );
}
