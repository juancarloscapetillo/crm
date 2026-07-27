"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { CheckCircle2, Circle } from "lucide-react";
import { PageHeader, EmptyState, AlertDot } from "@/components/ui";
import { useFetch } from "@/lib/hooks";
import { formatDate } from "@/lib/labels";
import { toQueryString } from "@/lib/queryString";

const statusOptions = [
  { value: "", label: "Todas" },
  { value: "false", label: "Pendientes" },
  { value: "true", label: "Completadas" },
];

const alertOptions = [
  { value: "", label: "Todos" },
  { value: "green", label: "🟢 Verde" },
  { value: "yellow", label: "🟡 Amarillo" },
  { value: "red", label: "🔴 Rojo" },
];

export default function TareasPage() {
  const [completed, setCompleted] = useState("false");
  const [alert, setAlert] = useState("");
  const [creator, setCreator] = useState("");
  const qs = toQueryString({ completed });
  const { data, loading, reload } = useFetch<{ tasks: any[] }>(`/api/tasks${qs}`, [qs]);

  const allTasks = data?.tasks || [];
  const creatorOptions = Array.from(
    new Map(allTasks.filter((t) => t.createdBy).map((t) => [t.createdBy.id, t.createdBy.name])).entries()
  ).map(([id, name]) => ({ value: id, label: name }));

  let tasks = allTasks;
  if (alert) tasks = tasks.filter((t) => t.prospectAlertStatus === alert);
  if (creator) tasks = tasks.filter((t) => t.createdBy?.id === creator);

  const now = new Date();

  async function toggle(prospectId: string, taskId: string, next: boolean) {
    const res = await fetch(`/api/prospects/${prospectId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: next }),
    });
    if (res.ok) {
      toast.success(next ? "Tarea completada" : "Tarea reabierta");
      reload();
    }
  }

  return (
    <div>
      <PageHeader title="Tareas y seguimientos" subtitle="Actividades pendientes con cada prospecto, priorizadas por semáforo de seguimiento" />
      <div className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-xl2 p-3">
          <div>
            <label className="label">Estado</label>
            <select className="input" value={completed} onChange={(e) => setCompleted(e.target.value)}>
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Semáforo del prospecto</label>
            <select className="input" value={alert} onChange={(e) => setAlert(e.target.value)}>
              {alertOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Creado por</label>
            <select className="input" value={creator} onChange={(e) => setCreator(e.target.value)}>
              <option value="">Todos</option>
              {creatorOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p className="text-sm text-gray-500">Cargando tareas...</p>}
        {!loading && tasks.length === 0 && <EmptyState title="No hay tareas con estos filtros" />}

        <div className="card divide-y divide-gray-100">
          {tasks.map((t) => {
            const overdue = t.dueDate && !t.completed && new Date(t.dueDate) < now;
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <button onClick={() => toggle(t.prospect.id, t.id, !t.completed)}>
                  {t.completed ? (
                    <CheckCircle2 size={20} className="text-alert-green" />
                  ) : (
                    <Circle size={20} className="text-gray-300" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${t.completed ? "line-through text-gray-400" : "text-gray-900"}`}>{t.title}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                    <Link href={`/prospectos/${t.prospect.id}`} className="text-calume-navy hover:underline">
                      {t.prospect.name}
                    </Link>
                    <AlertDot status={t.prospectAlertStatus} />
                    {t.dueDate && (
                      <span className={overdue ? "text-alert-red font-medium" : ""}>
                        Vence: {formatDate(t.dueDate)} {overdue && "(vencida)"}
                      </span>
                    )}
                    <span>Creada por: {t.createdBy?.name || "—"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
