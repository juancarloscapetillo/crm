"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2, Copy } from "lucide-react";
import { useFetch, useCatalogs } from "@/lib/hooks";
import { ConfirmDialog } from "@/components/ui";
import { formatDate } from "@/lib/labels";

export default function MetaAdsSection() {
  const { data, reload } = useFetch<{ sources: any[] }>("/api/meta-lead-sources");
  const { projects } = useCatalogs();
  const [pageId, setPageId] = useState("");
  const [token, setToken] = useState("");
  const [projectId, setProjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/meta-leads` : "/api/webhooks/meta-leads";

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  }

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!pageId.trim() || !token.trim()) return;
    setSaving(true);
    const res = await fetch("/api/meta-lead-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId: pageId.trim(), pageAccessToken: token.trim(), projectId: projectId || null }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error || "No se pudo conectar la página");
      return;
    }
    toast.success("Página conectada");
    setPageId("");
    setToken("");
    setProjectId("");
    reload();
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/meta-lead-sources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      toast.success(active ? "Página activada" : "Página pausada");
      reload();
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    const res = await fetch(`/api/meta-lead-sources/${toDelete}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Página desconectada");
      reload();
    }
    setToDelete(null);
  }

  const sources = data?.sources || [];

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900">Configuración del webhook en Meta</h3>
        <p className="text-xs text-gray-500 mt-1">
          Pega estos dos valores en tu App de Meta for Developers (Webhooks → Page → leadgen).
        </p>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <code className="input flex-1 text-xs overflow-x-auto whitespace-nowrap">{webhookUrl}</code>
            <button className="btn-secondary text-xs" onClick={() => copy(webhookUrl, "URL")}>
              <Copy size={13} /> Copiar
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            El "Verify Token" es el valor que configuraron en la variable <code>META_WEBHOOK_VERIFY_TOKEN</code> de Railway.
          </p>
        </div>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Páginas conectadas</h3>
        <p className="text-xs text-gray-500 mb-3">
          Cada Página de Facebook con anuncios de leads que quieras recibir aquí necesita su propio Token de acceso de página.
        </p>

        <div className="space-y-2 mb-4">
          {sources.length === 0 && <p className="text-xs text-gray-400">Aún no has conectado ninguna página.</p>}
          {sources.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded border border-gray-100 text-sm">
              <div>
                <div className="font-medium text-gray-900">{s.pageName || s.pageId}</div>
                <div className="text-xs text-gray-500">
                  {s.project?.name || "Sin proyecto vinculado"} · Conectada el {formatDate(s.createdAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActive(s.id, !s.active)}
                  className={`badge ${s.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {s.active ? "Activa" : "Pausada"}
                </button>
                <button onClick={() => setToDelete(s.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={connect} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-gray-100">
          <div>
            <label className="label">ID de la Página de Facebook</label>
            <input className="input" value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Ej. 123456789012345" />
          </div>
          <div>
            <label className="label">Proyecto (opcional)</label>
            <select className="input" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Sin vincular</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Token de acceso de página</label>
            <input className="input" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Token de acceso de larga duración" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-gold">
              <Plus size={14} /> {saving ? "Conectando..." : "Conectar página"}
            </button>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Desconectar página"
        message="Los nuevos leads de esta página dejarán de crear prospectos en el CRM."
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
