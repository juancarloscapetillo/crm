"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { useFetch } from "@/lib/hooks";
import { ConfirmDialog } from "@/components/ui";

export default function ProjectsSection() {
  const { data, reload } = useFetch<{ projects: any[] }>("/api/projects");
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error);
      return;
    }
    toast.success("Proyecto creado");
    setName("");
    reload();
  }

  async function handleDelete() {
    if (!toDelete) return;
    const res = await fetch(`/api/projects/${toDelete}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Proyecto eliminado");
      reload();
    } else {
      toast.error("No se pudo eliminar (tiene prospectos asociados)");
    }
    setToDelete(null);
  }

  return (
    <div className="card p-4 max-w-2xl">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Proyectos inmobiliarios</h3>
      <form onSubmit={handleCreate} className="flex items-end gap-2 mb-4">
        <div className="flex-1">
          <label className="label">Nuevo proyecto</label>
          <input className="input" placeholder="Ej. Muretto" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn-gold">
          <Plus size={15} /> Agregar
        </button>
      </form>
      <div className="space-y-1">
        {(data?.projects || []).map((p) => (
          <div key={p.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50 text-sm">
            <span>{p.name}</span>
            <button onClick={() => setToDelete(p.id)} className="text-gray-400 hover:text-red-500">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar proyecto"
        message="Solo puede eliminarse si no tiene prospectos asociados."
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
