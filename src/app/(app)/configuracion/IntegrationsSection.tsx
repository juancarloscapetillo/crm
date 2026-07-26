"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { useFetch } from "@/lib/hooks";

export default function IntegrationsSection() {
  const { data, loading, reload } = useFetch<{ todoistConnected: boolean }>("/api/users/me/integrations");
  const [token, setToken] = useState("");
  const [saving, setSaving] = useState(false);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!token.trim()) return;
    setSaving(true);
    const res = await fetch("/api/users/me/integrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ todoistApiToken: token.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error || "No se pudo conectar Todoist");
      return;
    }
    toast.success("Todoist conectado");
    setToken("");
    reload();
  }

  async function disconnect() {
    const res = await fetch("/api/users/me/integrations", { method: "DELETE" });
    if (res.ok) {
      toast.success("Todoist desconectado");
      reload();
    }
  }

  const connected = data?.todoistConnected;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Todoist</h3>
            <p className="text-xs text-gray-500 mt-1">
              Cuando se te asigna una tarea de seguimiento en el CRM, se crea automáticamente en tu Todoist personal
              (dentro de un proyecto "Calume CRM"). Completarla en el CRM también la marca como hecha en Todoist.
            </p>
          </div>
          {!loading && connected && (
            <span className="badge bg-green-50 text-green-700 flex-shrink-0">
              <CheckCircle2 size={13} /> Conectado
            </span>
          )}
        </div>

        {!loading && !connected && (
          <form onSubmit={connect} className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              className="input flex-1"
              placeholder="Pega aquí tu token de API de Todoist"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <button type="submit" disabled={saving} className="btn-gold whitespace-nowrap">
              {saving ? "Conectando..." : "Conectar"}
            </button>
          </form>
        )}
        {!loading && !connected && (
          <a
            href="https://todoist.com/app/settings/integrations/developer"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-calume-navy hover:underline"
          >
            <ExternalLink size={12} /> ¿Dónde encuentro mi token? Todoist → Configuración → Integraciones → Developer
          </a>
        )}
        {!loading && connected && (
          <button className="btn-secondary text-xs mt-3" onClick={disconnect}>
            Desconectar
          </button>
        )}
      </div>

      <div className="card p-4 opacity-60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Google Calendar</h3>
            <p className="text-xs text-gray-500 mt-1">Próximamente.</p>
          </div>
          <span className="badge bg-gray-100 text-gray-500">No disponible</span>
        </div>
      </div>
    </div>
  );
}
