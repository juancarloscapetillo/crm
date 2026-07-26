"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { PageHeader } from "@/components/ui";
import TagsSection from "./TagsSection";
import ProjectsSection from "./ProjectsSection";
import UsersSection from "./UsersSection";
import DemoDataSection from "./DemoDataSection";
import IntegrationsSection from "./IntegrationsSection";

const tabs = [
  { key: "tags", label: "Tags" },
  { key: "proyectos", label: "Proyectos" },
  { key: "integraciones", label: "Integraciones" },
  { key: "usuarios", label: "Usuarios" },
  { key: "demo", label: "Datos demostrativos" },
];

export default function ConfiguracionPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const [tab, setTab] = useState("tags");

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Catálogos, tags, usuarios y datos demostrativos" />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((t) => {
            if (t.key === "usuarios" && !isAdmin) return null;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                  tab === t.key ? "border-calume-navy text-calume-navy" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "tags" && <TagsSection />}
        {tab === "proyectos" && <ProjectsSection />}
        {tab === "integraciones" && <IntegrationsSection />}
        {tab === "usuarios" && isAdmin && <UsersSection />}
        {tab === "demo" && <DemoDataSection isAdmin={isAdmin} />}
      </div>
    </div>
  );
}
