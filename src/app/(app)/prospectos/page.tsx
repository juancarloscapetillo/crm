"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Plus, Filter as FilterIcon } from "lucide-react";
import { PageHeader, Modal, EmptyState, AlertDot } from "@/components/ui";
import ProspectForm, { ProspectFormValues } from "@/components/ProspectForm";
import ProspectCard, { ProspectCardData } from "@/components/ProspectCard";
import { useFetch, useCatalogs, useTick } from "@/lib/hooks";
import { toQueryString } from "@/lib/queryString";
import { stageLabels } from "@/lib/labels";

const alertOptions = [
  { value: "", label: "Todos" },
  { value: "green", label: "🟢 Verdes" },
  { value: "yellow", label: "🟡 Amarillos" },
  { value: "red", label: "🔴 Rojos" },
  { value: "sin_actividad", label: "Sin próxima actividad" },
  { value: "vencido", label: "Con seguimiento vencido" },
];

export default function ProspectosPage() {
  const router = useRouter();
  const { tags, projects, users } = useCatalogs();
  const [stage, setStage] = useState("");
  const [alert, setAlert] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const qs = toQueryString({ stage, alert });
  const { data, loading, reload } = useFetch<{ prospects: ProspectCardData[] }>(`/api/prospects${qs}`, [qs]);
  useTick();

  async function handleCreate(values: ProspectFormValues) {
    const res = await fetch("/api/prospects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        budget: values.budget || null,
        estimatedValue: values.estimatedValue || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    const { prospect } = await res.json();
    toast.success("Prospecto creado");
    setShowCreate(false);
    router.push(`/prospectos/${prospect.id}`);
  }

  function handleFavoriteToggle(id: string, next: boolean) {
    reload();
  }

  const prospects = data?.prospects || [];

  return (
    <div>
      <PageHeader
        title="Prospectos"
        subtitle={`${prospects.length} prospecto(s)`}
        actions={
          <button className="btn-gold" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nuevo prospecto
          </button>
        }
      />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-xl2 p-3">
          <FilterIcon size={16} className="text-gray-400 mb-2" />
          <div>
            <label className="label">Etapa</label>
            <select className="input" value={stage} onChange={(e) => setStage(e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(stageLabels).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Semáforo de seguimiento</label>
            <select className="input" value={alert} onChange={(e) => setAlert(e.target.value)}>
              {alertOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p className="text-sm text-gray-500">Cargando prospectos...</p>}

        {!loading && prospects.length === 0 && (
          <EmptyState
            title="No hay prospectos que coincidan con estos filtros"
            description="Registra tu primer prospecto para comenzar a darle seguimiento."
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {prospects.map((p) => (
            <ProspectCard key={p.id} prospect={p} onFavoriteToggle={handleFavoriteToggle} />
          ))}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo prospecto" wide>
        <ProspectForm onSubmit={handleCreate} submitLabel="Crear prospecto" />
      </Modal>
    </div>
  );
}
