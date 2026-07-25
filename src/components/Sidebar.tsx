"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Star,
  ListChecks,
  UserCog,
  Building2,
  Megaphone,
  FileBarChart,
  Settings,
  X,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/prospectos", label: "Prospectos", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/favoritos", label: "Favoritos", icon: Star },
  { href: "/tareas", label: "Tareas y seguimientos", icon: ListChecks },
  { href: "/asesores", label: "Asesores", icon: UserCog },
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/reportes", label: "Reportes", icon: FileBarChart },
  { href: "/configuracion", label: "Configuración", icon: Settings },
];

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-calume-navy text-white w-64">
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/10">
        <Image src="/brand/calume-logo.png" alt="Calume Desarrollos" width={155} height={50} priority />
        <button className="lg:hidden text-white/70" onClick={onNavigate} aria-label="Cerrar menú">
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-calume-gold text-calume-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 text-[11px] text-white/50">
        Calume CRM · Prototipo v1.0
      </div>
    </div>
  );
}
