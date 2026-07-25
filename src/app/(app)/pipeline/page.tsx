"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners, DragStartEvent, DragEndEvent,
} from "@dnd-kit/core";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import toast from "react-hot-toast";
import { Plus, Star } from "lucide-react";
import { PageHeader, Modal } from "@/components/ui";
import ProspectForm, { ProspectFormValues } from "@/components/ProspectForm";
import ProspectCard, { ProspectCardData } from "@/components/ProspectCard";
import { useFetch, useTick } from "@/lib/hooks";
import { pipelineStages, stageLabels, stageColors, formatCurrency } from "@/lib/labels";
import { Stage } from "@prisma/client";
import { hoursSince } from "@/lib/alert";

const kanbanStages: Stage[] = ["INFORMES", "VISITA", "NEGOCIACION", "GANADO", "PERDIDO"];
const FAVORITES_ID = "FAVORITOS";

function DroppableColumn({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`flex-1 min-w-[280px] rounded-xl2 p-2 transition-colors ${isOver ? "bg-calume-navy/5" : ""}`}>
      {children}
    </div>
  );
}

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
  const { data, loading, reload } = useFetch<{ prospects: ProspectCardData[] }>("/api/prospects");
  useTick();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localOverride, setLocalOverride] = useState<Record<string, Stage>>({});
  const [showCreate, setShowCreate] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
      <div className="flex-1 overflow-x-auto p-4 sm:p-6">
        {loading && <p className="text-sm text-gray-500">Cargando pipeline...</p>}
        {!loading && (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 min-h-[70vh]">
              <DroppableColumn id={FAVORITES_ID}>
                <div className="bg-white rounded-xl2 border border-gray-200 p-3 mb-2 sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5 text-calume-gold">
                      <Star size={14} className="fill-calume-gold" /> Favoritos
                    </h3>
                    <span className="text-xs font-medium bg-gray-100 rounded-full px-2 py-0.5">{favoriteItems.length}</span>
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
                  <DroppableColumn key={stage} id={stage}>
                    <div className="bg-white rounded-xl2 border border-gray-200 p-3 mb-2 sticky top-0 z-10">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold" style={{ color: stageColors[stage] }}>
                          {stageLabels[stage]}
                        </h3>
                        <span className="text-xs font-medium bg-gray-100 rounded-full px-2 py-0.5">{items.length}</span>
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
