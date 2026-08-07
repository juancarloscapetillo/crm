"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Star, Trash2, Paperclip, Download, Plus, CheckCircle2, Circle, Handshake } from "lucide-react";
import { PageHeader, Modal, StageBadge, AlertDot, TagPill, ConfirmDialog } from "@/components/ui";
import ProspectForm, { ProspectFormValues } from "@/components/ProspectForm";
import Fireworks from "@/components/Fireworks";
import { useFetch, useTick } from "@/lib/hooks";
import { formatCurrency, formatDate, formatDateTime, sourceLabels, activityIcons, activityLabels, stageLabels } from "@/lib/labels";
import { pipelineStages } from "@/lib/labels";
import { Stage } from "@prisma/client";
import { getAlertStatus } from "@/lib/alert";

const activityTypeOptions = [
  { value: "COMENTARIO", label: "💬 Comentario" },
  { value: "LLAMADA", label: "📞 Llamada" },
  { value: "MENSAJE", label: "📩 Mensaje" },
  { value: "CORREO", label: "✉️ Correo" },
  { value: "VISITA", label: "🏠 Visita" },
];

export default function ProspectProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, reload } = useFetch<{ prospect: any }>(`/api/prospects/${id}`);
  useTick();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLossReason, setShowLossReason] = useState(false);
  const [pendingStage, setPendingStage] = useState<Stage | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [activityType, setActivityType] = useState("COMENTARIO");
  const [activityContent, setActivityContent] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  const prospect = data?.prospect;

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/pipeline");
    }
  }

  async function toggleFavorite() {
    const res = await fetch(`/api/prospects/${id}/favorite`, { method: "POST" });
    if (res.ok) {
      reload();
    }
  }

  async function handleEditSubmit(values: ProspectFormValues) {
    const res = await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, budget: values.budget || null, estimatedValue: values.estimatedValue || null }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    toast.success("Prospecto actualizado");
    setShowEdit(false);
    reload();
  }

  async function changeStage(stage: Stage) {
    if (stage === "PERDIDO") {
      setPendingStage(stage);
      setShowLossReason(true);
      return;
    }
    await doChangeStage(stage);
  }

  async function doChangeStage(stage: Stage, reason?: string) {
    const res = await fetch(`/api/prospects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage, lossReason: reason }),
    });
    if (!res.ok) {
      toast.error("No se pudo cambiar la etapa");
      return;
    }
    toast.success(`Etapa actualizada a ${stageLabels[stage]}`);
    if (stage === "GANADO") setCelebrate(true);
    setShowLossReason(false);
    setPendingStage(null);
    setLossReason("");
    reload();
  }

  async function handleDelete() {
    const res = await fetch(`/api/prospects/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error((await res.json()).error || "No se pudo eliminar");
      return;
    }
    toast.success("Prospecto eliminado");
    router.push("/pipeline");
  }

  async function submitActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activityContent.trim()) return;
    const res = await fetch(`/api/prospects/${id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: activityType, content: activityContent }),
    });
    if (!res.ok) {
      toast.error("No se pudo registrar la actividad");
      return;
    }
    setActivityContent("");
    toast.success("Actividad registrada");
    reload();
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteContent.trim()) return;
    const res = await fetch(`/api/prospects/${id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "COMENTARIO", content: noteContent }),
    });
    if (!res.ok) {
      toast.error("No se pudo agregar la nota");
      return;
    }
    setNoteContent("");
    toast.success("Nota agregada");
    reload();
  }

  async function submitTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    const res = await fetch(`/api/prospects/${id}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: taskTitle, dueDate: taskDue || null }),
    });
    if (!res.ok) {
      toast.error("No se pudo crear la tarea");
      return;
    }
    setTaskTitle("");
    setTaskDue("");
    toast.success("Tarea creada");
    reload();
  }

  async function toggleTask(taskId: string, completed: boolean) {
    const res = await fetch(`/api/prospects/${id}/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    });
    if (res.ok) reload();
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/prospects/${id}/attachments`, { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      toast.error((await res.json()).error || "No se pudo subir el archivo");
      return;
    }
    toast.success("Archivo adjuntado");
    reload();
    e.target.value = "";
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando prospecto...</div>;
  if (!prospect) return <div className="p-6 text-sm text-gray-500">Prospecto no encontrado.</div>;

  return (
    <div>
      <Fireworks active={celebrate} onDone={() => setCelebrate(false)} />
      <PageHeader
        title={prospect.name}
        subtitle={`Ingresó el ${formatDate(prospect.entryDate)} · Fuente: ${sourceLabels[prospect.sourceType as keyof typeof sourceLabels]}`}
        onBack={handleBack}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={toggleFavorite} className="btn-secondary" title="Favorito">
              <Star size={16} className={prospect.isFavorite ? "fill-calume-gold text-calume-gold" : ""} />
            </button>
            <button className="btn-secondary" onClick={() => setShowEdit(true)}>Editar</button>
            <button className="btn-danger" onClick={() => setShowDelete(true)}>
              <Trash2 size={15} />
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <StageBadge stage={prospect.stage} />
          <AlertDot status={getAlertStatus(prospect.lastActivityAt, prospect.stage, prospect.nextActionDate, prospect.nextAction)} showLabel />
          {prospect.tags.map((t: any) => (
            <TagPill key={t.tag.id} name={t.tag.name} color={t.tag.color} />
          ))}
        </div>

        {prospect.advisor && (
          <div className="card p-3 bg-calume-navy/5 border-calume-navy/10 flex items-center gap-2">
            <Handshake size={16} className="text-calume-navy shrink-0" />
            <span className="text-sm text-gray-700">
              Lo trae el asesor <strong className="text-calume-navy">{prospect.advisor.name}</strong>
              {prospect.advisor.company && <> · {prospect.advisor.company.commercialName}</>}
            </span>
          </div>
        )}

        {prospect.stage !== "GANADO" && prospect.stage !== "PERDIDO" && (
          <div className="card p-4">
            <div className="text-xs font-medium text-gray-500 mb-2">Mover a otra etapa</div>
            <div className="flex flex-wrap gap-2">
              {pipelineStages.map((s) => (
                <button
                  key={s}
                  disabled={s === prospect.stage}
                  onClick={() => changeStage(s)}
                  className={`btn-secondary text-xs ${s === prospect.stage ? "opacity-40" : ""}`}
                >
                  {stageLabels[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {prospect.stage === "PERDIDO" && prospect.lossReason && (
          <div className="card p-4 bg-red-50 border-red-100">
            <div className="text-xs font-medium text-red-700">Motivo de pérdida</div>
            <div className="text-sm text-red-800 mt-1">{prospect.lossReason}</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Expediente</h3>
              <dl className="space-y-2 text-sm">
                <Field label="Teléfono" value={prospect.phone} />
                <Field label="Correo" value={prospect.email} />
                <Field label="Empresa" value={prospect.companyName || prospect.company?.commercialName} />
                <Field label="Vendedor asignado" value={prospect.assignedUser?.name} />
                <Field label="Proyecto de interés" value={prospect.project?.name} />
                <Field label="Unidad / tipología" value={prospect.unitInterest} />
                <Field label="Presupuesto" value={formatCurrency(prospect.budget)} />
                <Field label="Valor estimado" value={formatCurrency(prospect.estimatedValue)} />
                <Field label="Forma de pago" value={prospect.paymentMethod} />
                <Field
                  label="Asesor externo"
                  value={prospect.advisor?.name && `${prospect.advisor.name}${prospect.advisor.company ? ` (${prospect.advisor.company.commercialName})` : ""}`}
                />
                <Field label="Próxima acción" value={prospect.nextAction} />
                <Field label="Fecha próximo seguimiento" value={formatDate(prospect.nextActionDate)} />
              </dl>
              {prospect.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs font-medium text-gray-500">Notas</div>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{prospect.notes}</p>
                </div>
              )}
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Paperclip size={15} /> Documentos adjuntos
              </h3>
              <div className="space-y-2">
                {prospect.attachments.length === 0 && <p className="text-xs text-gray-400">Sin archivos adjuntos.</p>}
                {prospect.attachments.map((a: any) => (
                  <a
                    key={a.id}
                    href={`/api/attachments/${a.id}`}
                    className="flex items-center justify-between text-sm px-2 py-1.5 rounded hover:bg-gray-50"
                  >
                    <span className="truncate">{a.filename}</span>
                    <Download size={14} className="text-gray-400 flex-shrink-0" />
                  </a>
                ))}
              </div>
              <label className="btn-secondary text-xs mt-3 cursor-pointer inline-flex">
                {uploading ? "Subiendo..." : "Subir archivo"}
                <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Tareas</h3>
              <form onSubmit={submitTask} className="flex flex-col gap-2 mb-3">
                <input className="input" placeholder="Nueva tarea..." value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                <div className="flex gap-2">
                  <input type="date" className="input" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
                  <button type="submit" className="btn-primary text-xs whitespace-nowrap">
                    <Plus size={14} /> Agregar
                  </button>
                </div>
              </form>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {prospect.tasks.length === 0 && <p className="text-xs text-gray-400">Sin tareas registradas.</p>}
                {prospect.tasks.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => toggleTask(t.id, !t.completed)}
                    className="w-full flex items-start gap-2 text-left text-sm px-2 py-1.5 rounded hover:bg-gray-50"
                  >
                    {t.completed ? (
                      <CheckCircle2 size={16} className="text-alert-green flex-shrink-0 mt-0.5" />
                    ) : (
                      <Circle size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="flex-1">
                      <span className={t.completed ? "line-through text-gray-400" : "text-gray-800"}>{t.title}</span>
                      {t.dueDate && <span className="block text-[11px] text-gray-400">Vence: {formatDate(t.dueDate)}</span>}
                      <span className="block text-[11px] text-gray-400">Creada por: {t.createdBy?.name || "—"}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Notas</h3>
              <form onSubmit={submitNote} className="flex flex-col gap-2 mb-3">
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Escribe una nota..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                />
                <button type="submit" className="btn-primary text-xs self-end">
                  <Plus size={14} /> Agregar nota
                </button>
              </form>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {prospect.activities.filter((a: any) => a.type === "COMENTARIO").length === 0 && (
                  <p className="text-xs text-gray-400">Sin notas registradas.</p>
                )}
                {prospect.activities
                  .filter((a: any) => a.type === "COMENTARIO")
                  .map((a: any) => (
                    <div key={a.id} className="text-sm px-2 py-1.5 rounded hover:bg-gray-50">
                      <span className="text-gray-800 whitespace-pre-wrap">{a.content}</span>
                      <span className="block text-[11px] text-gray-400 mt-0.5">
                        {a.user?.name || "Sistema"} · {formatDateTime(a.createdAt)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Línea de tiempo</h3>
              <form onSubmit={submitActivity} className="space-y-2 mb-4">
                <select className="input" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
                  {activityTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <textarea
                  className="input"
                  rows={2}
                  placeholder="Describe la actividad..."
                  value={activityContent}
                  onChange={(e) => setActivityContent(e.target.value)}
                />
                <button type="submit" className="btn-primary text-xs w-full">Registrar actividad</button>
              </form>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {prospect.activities.map((a: any) => (
                  <div key={a.id} className="flex gap-2 text-sm">
                    <span>{activityIcons[a.type as keyof typeof activityIcons]}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-gray-800">{a.content || activityLabels[a.type as keyof typeof activityLabels]}</div>
                      <div className="text-[11px] text-gray-400">
                        {a.user?.name || "Sistema"} · {formatDateTime(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar prospecto" wide>
        <ProspectForm
          initial={{
            name: prospect.name,
            phone: prospect.phone || "",
            email: prospect.email || "",
            sourceType: prospect.sourceType,
            assignedUserId: prospect.assignedUserId || "",
            projectId: prospect.projectId || "",
            advisorId: prospect.advisorId || "",
            companyId: prospect.companyId || "",
            unitInterest: prospect.unitInterest || "",
            budget: prospect.budget?.toString() || "",
            estimatedValue: prospect.estimatedValue?.toString() || "",
            paymentMethod: prospect.paymentMethod || "",
            nextAction: prospect.nextAction || "",
            nextActionDate: prospect.nextActionDate ? prospect.nextActionDate.slice(0, 10) : "",
            notes: prospect.notes || "",
            tagIds: prospect.tags.map((t: any) => t.tag.id),
          }}
          onSubmit={handleEditSubmit}
          submitLabel="Guardar cambios"
        />
      </Modal>

      <Modal open={showLossReason} onClose={() => setShowLossReason(false)} title="Motivo de pérdida">
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Indica por qué se perdió este prospecto.</p>
          <textarea className="input" rows={3} value={lossReason} onChange={(e) => setLossReason(e.target.value)} placeholder="Ej. Presupuesto insuficiente" />
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowLossReason(false)}>Cancelar</button>
            <button className="btn-danger" onClick={() => pendingStage && doChangeStage(pendingStage, lossReason)}>
              Confirmar pérdida
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={showDelete}
        title="Eliminar prospecto"
        message="Esta acción no se puede deshacer. Se eliminará toda la información asociada a este prospecto."
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-900 font-medium text-right">{value || "—"}</dd>
    </div>
  );
}
