"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { useFetch } from "@/lib/hooks";
import { ConfirmDialog, TagPill } from "@/components/ui";

const palette = ["#253574", "#F6B436", "#5B8DEF", "#9B6FD9", "#3FBE7A", "#E15B5B"];

export default function TagsSection() {
  const { data, reload } = useFetch<{ tags: any[] }>("/api/tags");
  const [name, setName] = useState("");
  const [color, setColor] = useState(palette[0]);
  const [toDelete, setToDelete] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const res = await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) {
      toast.error((await res.json()).error);
      return;
    }
    toast.success("Tag creado");
    setName("");
    reload();
  }

  async function handleDelete() {
    if (!toDelete) return;
    const res = await fetch(`/api/tags/${toDelete}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Tag eliminado");
      reload();
    }
    setToDelete(null);
  }

  return (
    <div className="card p-4 max-w-2xl">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Tags personalizables</h3>
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2 mb-4">
        <div className="flex-1 min-w-[160px]">
          <label className="label">Nuevo tag</label>
          <input className="input" placeholder="Ej. CirculoCalume" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Color</label>
          <div className="flex gap-1">
            {palette.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setColor(c)}
                className="h-8 w-8 rounded-full border-2"
                style={{ backgroundColor: c, borderColor: color === c ? "#111" : "transparent" }}
              />
            ))}
          </div>
        </div>
        <button type="submit" className="btn-gold">
          <Plus size={15} /> Agregar
        </button>
      </form>

      <div className="space-y-2">
        {(data?.tags || []).map((t) => (
          <div key={t.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-50">
            <TagPill name={t.name} color={t.color} />
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{t._count?.prospects || 0} prospectos</span>
              <button onClick={() => setToDelete(t.id)} className="text-gray-400 hover:text-red-500">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar tag"
        message="Se quitará este tag de todos los prospectos que lo tengan asignado."
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
