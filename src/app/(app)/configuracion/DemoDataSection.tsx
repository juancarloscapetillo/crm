"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useFetch } from "@/lib/hooks";
import { ConfirmDialog } from "@/components/ui";

export default function DemoDataSection({ isAdmin }: { isAdmin: boolean }) {
  const { data, reload } = useFetch<{ prospects: any[] }>("/api/prospects?includeDemo=true");
  const demoCount = (data?.prospects || []).filter((p) => p.isDemo).length;
  const [loading, setLoading] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/demo", { method: "POST" });
    setLoading(false);
    if (!res.ok) {
      toast.error((await res.json()).error);
      return;
    }
    toast.success("Datos demostrativos generados");
    reload();
  }

  async function remove() {
    setLoading(true);
    const res = await fetch("/api/demo", { method: "DELETE" });
    setLoading(false);
    setShowConfirmDelete(false);
    if (!res.ok) {
      toast.error("No se pudieron eliminar");
      return;
    }
    toast.success("Datos demostrativos eliminados");
    reload();
  }

  return (
    <div className="card p-4 max-w-2xl">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">Datos demostrativos</h3>
      <p className="text-sm text-gray-600 mb-4">
        Genera prospectos y registros de inversión de ejemplo, claramente marcados como <strong>⚠ Dato demostrativo</strong>,
        útiles para visualizar el dashboard y los reportes antes de capturar información real. Puedes eliminarlos en
        cualquier momento sin afectar tus datos reales.
      </p>
      <p className="text-sm text-gray-500 mb-4">Actualmente hay <strong>{demoCount}</strong> prospectos demostrativos.</p>
      {!isAdmin && <p className="text-xs text-amber-600 mb-3">Solo un administrador puede generar o eliminar datos demostrativos.</p>}
      <div className="flex gap-2">
        <button className="btn-primary" disabled={!isAdmin || loading || demoCount > 0} onClick={generate}>
          {loading ? "Generando..." : "Generar datos demostrativos"}
        </button>
        <button className="btn-danger" disabled={!isAdmin || loading || demoCount === 0} onClick={() => setShowConfirmDelete(true)}>
          Eliminar datos demostrativos
        </button>
      </div>

      <ConfirmDialog
        open={showConfirmDelete}
        title="Eliminar datos demostrativos"
        message="Se eliminarán todos los prospectos y registros de marketing marcados como demostrativos."
        onConfirm={remove}
        onCancel={() => setShowConfirmDelete(false)}
      />
    </div>
  );
}
