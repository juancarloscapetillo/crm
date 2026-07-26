"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, DragStartEvent, DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import toast from "react-hot-toast";
import { Plus, Star, X, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader, Modal } from "@/components/ui";
import ProspectForm, { ProspectFormValues } from "@/components/ProspectForm";
import ProspectCard, { ProspectCardData } from "@/components/ProspectCard";
import { useFetch, useTick, useCatalogs } from "@/lib/hooks";
import { pipelineStages, stageLabels, stageColors, formatCurrency } from "@/lib/labels";
import { toQueryString } from "@/lib/queryString";
import { Stage } from "@prisma/client";
import { hoursSince } from "@/lib/alert";

const kanbanStages: Stage[] = ["SIN_CONTACTAR", "INFORMES", "VISITA", "NEGOCIACION", "GANADO", "PERDIDO"];
const FAVORITES_ID = "FAVORITOS";

const sourceOptions = [
  { value: "DIRECTO", label: "Venta directa" },
  { value: "ASESOR_EXTERNO", label: "Asesor externo" },
  { value: "COMUNIDAD", label: "Comunidad / Alianza" },
  { value: "REFERIDO", label: "Referido" },
  { value: "CAMPANA", label: "Campaña de marketing" },
];

type PipelineFilters = {
  project?: string;
  tag?: string;
  advisor?: string;
  company?: string;
  vendedor?: string;
  source?: string;
};

function DroppableColumn({ id, collapsed, children }: { id: string; collapsed?: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`${collapsed ? "w-48 flex-shrink-0" : "flex-1 min-w-[280px]"} rounded-xl2 p-2 transition-all ${isOver ? "bg-calume-navy/5" : ""}`}
    >
      {children}
    </div>
  );
}

const COLLAPSE_STORAGE_KEY = "pipeline-collapsed-columns";

function DraggableCard({ prospect, onFavoriteToggle }: { prospect: ProspectCardData; onFavoriteToggle: (id: string, next: boolean) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: prospect.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.4 : 1, zIndex: isDragging ? 10 : "auto" }
    : undefined;
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="mb-2 cursor-grab active:cursor-grabbing">
      <ProspectCard prospect={prospect} onFavoriteToggle={onFavoriteToggle} />
    </div>
  );
}

export default function PipelinePage() {
  const router = useRouter();
  const [filters, setFilters] = useState<PipelineFilters>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COLLAPSE_STORAGE_KEY);
      if (stored) setCollapsed(JSON.parse(stored));
    } catch {
      // ignore malformed storage
    }
  }, []);

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(COLLAPSE_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const qs = toQueryString(filters as any);
  const { data, loading, reload } = useFetch<{ prospects: ProspectCardData[] }>(`/api/prospects${qs}`);
  const { projects, tags, advisors, companies, users } = useCatalogs();
  useTick();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localOverride, setLocalOverride] = useState<Record<string, Stage>>({});
  const [showCreate, setShowCreate] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const hasFilters = !!(filters.project || filters.tag || filters.advisor || filters.company || filters.vendedor || filters.source);

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
    reload();
    router.push(`/prospectos/${prospect.id}`);
  }

  const prospects = (data?.prospects || []).map((p) => (localOverride[p.id] ? { ...p, stage: localOverride[p.id] } : p)) as (ProspectCardData & { stage: Stage; stageEnteredAt: string; estimatedValue: number | null })[];

  const grouped = useMemo(() => {
    const map: Record<string, typeof prospects> = {};
    for (const s of kanbanStages) map[s] = [];
    for (const p of prospects) {
      (map[(p as any).stage] ||= []).push(p);
    }
    return map;
  }, [prospects]);

  const favoriteItems = useMemo(() => prospects.filter((p) => (p as any).isFavorite), [prospects]);

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const prospectId = active.id as string;
    const current = prospects.find((p) => p.id === prospectId);
    if (!current) return;

    if (over.id === FAVORITES_ID) {
      if ((current as any).isFavorite) return;
      const res = await fetch(`/api/prospects/${prospectId}/favorite`, { method: "POST" });
      if (!res.ok) toast.error("No se pudo agregar a favoritos");
      else toast.success("Agregado a favoritos");
      reload();
      return;
    }

    const newStage = over.id as Stage;
    if ((current as any).stage === newStage) return;

    if (newStage === "PERDIDO") {
      const reason = window.prompt("Motivo de pérdida (opcional):") || "";
      setLocalOverride((o) => ({ ...o, [prospectId]: newStage }));
      const res = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage, lossReason: reason }),
      });
      if (!res.ok) toast.error("No se pudo mover el prospecto");
      else toast.success("Prospecto movido a Perdido");
      reload();
      return;
    }

    setLocalOverride((o) => ({ ...o, [prospectId]: newStage }));
    const res = await fetch(`/api/prospects/${prospectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    if (!res.ok) {
      toast.error("No se pudo mover el prospecto");
      reload();
      return;
    }
    toast.success(`Movido a ${stageLabels[newStage]}`);
    reload();
  }

  const activeProspect = prospects.find((p) => p.id === activeId);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Pipeline de ventas"
        subtitle="Arrastra las tarjetas para mover a los prospectos entre etapas"
        actions={
          <button className="btn-gold" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nuevo prospecto
          </button>
        }
      />
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-xl2 p-3">
          <div>
            <label className="label">Proyecto</label>
            <select className="input" value={filters.project || ""} onChange={(e) => setFilters((f) => ({ ...f, project: e.target.value || undefined }))}>
              <option value="">Todos</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tag</label>
            <select className="input" value={filters.tag || ""} onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value || undefined }))}>
              <option value="">Todos</option>
              {tags.map((t: any) => (
                <option key={t.id} value={t.id}>#{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Asesor externo</label>
            <select className="input" value={filters.advisor || ""} onChange={(e) => setFilters((f) => ({ ...f, advisor: e.target.value || undefined }))}>
              <option value="">Todos</option>
              {advisors.map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Inmobiliaria</label>
            <select className="input" value={filters.company || ""} onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value || undefined }))}>
              <option value="">Todas</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.commercialName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Asignado a</label>
            <select className="input" value={filters.vendedor || ""} onChange={(e) => setFilters((f) => ({ ...f, vendedor: e.target.value || undefined }))}>
              <option value="">Todos</option>
              {users.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Fuente</label>
            <select className="input" value={filters.source || ""} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value || undefined }))}>
              <option value="">Todas</option>
              {sourceOptions.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          {hasFilters && (
            <button className="btn-secondary text-xs" onClick={() => setFilters({})}>
              <X size={14} /> Limpiar filtros
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        {loading && <p className="text-sm text-gray-500">Cargando pipeline...</p>}
        {!loading && (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 min-h-[70vh]">
              <DroppableColumn id={FAVORITES_ID} collapsed={collapsed[FAVORITES_ID]}>
                {collapsed[FAVORITES_ID] ? (
                  <button
                    onClick={() => toggleCollapse(FAVORITES_ID)}
                    className="w-full h-full min-h-[70vh] bg-white rounded-xl2 border border-gray-200 flex flex-col items-center gap-2 pt-4 hover:bg-gray-50"
                    title="Expandir Favoritos"
                  >
                    <ChevronRight size={16} className="text-gray-400" />
                    <Star size={16} className="fill-calume-gold text-calume-gold" />
                    <span className="text-xs font-medium bg-gray-100 rounded-full px-2 py-0.5">{favoriteItems.length}</span>
                    <span className="text-xs text-calume-gold font-semibold [writing-mode:vertical-rl] rotate-180 mt-1">
                      Favoritos
                    </span>
                  </button>
                ) : (
                  <>
                    <div className="bg-white rounded-xl2 border border-gray-200 p-3 mb-2 sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-1.5 text-calume-gold">
                          <Star size={14} className="fill-calume-gold" /> Favoritos
                        </h3>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium bg-gray-100 rounded-full px-2 py-0.5">{favoriteItems.length}</span>
                          <button
                            onClick={() => toggleCollapse(FAVORITES_ID)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Colapsar columna"
                          >
                            <ChevronLeft size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">No es una etapa: solo un acceso rápido</div>
                    </div>
                    <div className="min-h-[100px]">
                      {favoriteItems.map((p: any) => (
                        <div key={p.id} className="mb-2">
                          <ProspectCard prospect={p} onFavoriteToggle={reload} />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </DroppableColumn>
              {kanbanStages.map((stage) => {
                const items = grouped[stage] || [];
                const totalValue = items.reduce((s, p: any) => s + (p.estimatedValue || p.budget || 0), 0);
                const avgHours =
                  items.length > 0
                    ? items.reduce((s, p: any) => s + hoursSince(p.stageEnteredAt || p.updatedAt), 0) / items.length
                    : 0;
                const alertCount = items.filter((p: any) => p.alertStatus === "yellow" || p.alertStatus === "red").length;

                return (
                  <DroppableColumn key={stage} id={stage} collapsed={collapsed[stage]}>
                    {collapsed[stage] ? (
                      <button
                        onClick={() => toggleCollapse(stage)}
                        className="w-full h-full min-h-[70vh] bg-white rounded-xl2 border border-gray-200 flex flex-col items-center gap-2 pt-4 hover:bg-gray-50"
                        title={`Expandir ${stageLabels[stage]}`}
                      >
                        <ChevronRight size={16} className="text-gray-400" />
                        <span className="text-xs font-medium bg-gray-100 rounded-full px-2 py-0.5">{items.length}</span>
                        {alertCount > 0 && stage !== "GANADO" && stage !== "PERDIDO" && (
                          <span className="text-xs text-alert-red font-medium">⚠</span>
                        )}
                        <span
                          className="text-xs font-semibold [writing-mode:vertical-rl] rotate-180 mt-1"
                          style={{ color: stageColors[stage] }}
                        >
                          {stageLabels[stage]}
                        </span>
                      </button>
                    ) : (
                      <>
                        <div className="bg-white rounded-xl2 border border-gray-200 p-3 mb-2 sticky top-0 z-10">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold" style={{ color: stageColors[stage] }}>
                              {stageLabels[stage]}
                            </h3>
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-medium bg-gray-100 rounded-full px-2 py-0.5">{items.length}</span>
                              <button
                                onClick={() => toggleCollapse(stage)}
                                className="text-gray-400 hover:text-gray-600"
                                title="Colapsar columna"
                              >
                                <ChevronLeft size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{formatCurrency(totalValue)} potencial</div>
                          <div className="text-[11px] text-gray-400">
                            {stage !== "GANADO" && stage !== "PERDIDO" && `~${Math.round(avgHours / 24)}d promedio en etapa`}
                          </div>
                          {alertCount > 0 && stage !== "GANADO" && stage !== "PERDIDO" && (
                            <div className="text-[11px] text-alert-red font-medium mt-1">⚠ {alertCount} sin seguimiento</div>
                          )}
                        </div>
                        <div className="min-h-[100px]">
                          {items.map((p: any) => (
                            <DraggableCard key={p.id} prospect={p} onFavoriteToggle={reload} />
                          ))}
                        </div>
                      </>
                    )}
                  </DroppableColumn>
                );
              })}
            </div>
            <DragOverlay>
              {activeProspect ? <ProspectCard prospect={activeProspect} onFavoriteToggle={() => {}} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo prospecto" wide>
        <ProspectForm onSubmit={handleCreate} submitLabel="Crear prospecto" />
      </Modal>
    </div>
  );
}
