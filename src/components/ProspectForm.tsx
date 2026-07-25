"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useCatalogs } from "@/lib/hooks";

const sourceOptions = [
  { value: "DIRECTO", label: "Venta directa" },
  { value: "ASESOR_EXTERNO", label: "Asesor externo" },
  { value: "COMUNIDAD", label: "Comunidad / Alianza" },
  { value: "REFERIDO", label: "Referido" },
  { value: "CAMPANA", label: "Campaña de marketing" },
];

export type ProspectFormValues = {
  name: string;
  phone: string;
  email: string;
  sourceType: string;
  assignedUserId: string;
  projectId: string;
  advisorId: string;
  companyId: string;
  unitInterest: string;
  budget: string;
  estimatedValue: string;
  paymentMethod: string;
  nextAction: string;
  nextActionDate: string;
  notes: string;
  tagIds: string[];
};

export default function ProspectForm({
  initial,
  onSubmit,
  submitLabel = "Guardar",
  compact = false,
}: {
  initial?: Partial<ProspectFormValues>;
  onSubmit: (values: ProspectFormValues) => Promise<void>;
  submitLabel?: string;
  compact?: boolean;
}) {
  const { tags, projects, users, advisors, companies } = useCatalogs();
  const [values, setValues] = useState<ProspectFormValues>({
    name: initial?.name || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
    sourceType: initial?.sourceType || "DIRECTO",
    assignedUserId: initial?.assignedUserId || "",
    projectId: initial?.projectId || "",
    advisorId: initial?.advisorId || "",
    companyId: initial?.companyId || "",
    unitInterest: initial?.unitInterest || "",
    budget: initial?.budget || "",
    estimatedValue: initial?.estimatedValue || "",
    paymentMethod: initial?.paymentMethod || "",
    nextAction: initial?.nextAction || "",
    nextActionDate: initial?.nextActionDate || "",
    notes: initial?.notes || "",
    tagIds: initial?.tagIds || [],
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ProspectFormValues>(key: K, val: ProspectFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function toggleTag(id: string) {
    set("tagIds", values.tagIds.includes(id) ? values.tagIds.filter((t) => t !== id) : [...values.tagIds, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(values);
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Nombre completo *</label>
          <input className="input" value={values.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div>
          <label className="label">Teléfono</label>
          <input className="input" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label className="label">Correo electrónico</label>
          <input type="email" className="input" value={values.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label className="label">Fuente del prospecto</label>
          <select className="input" value={values.sourceType} onChange={(e) => set("sourceType", e.target.value)}>
            {sourceOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Vendedor asignado</label>
          <select className="input" value={values.assignedUserId} onChange={(e) => set("assignedUserId", e.target.value)}>
            <option value="">Sin asignar</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Proyecto de interés</label>
          <select className="input" value={values.projectId} onChange={(e) => set("projectId", e.target.value)}>
            <option value="">Sin especificar</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Unidad / tipología de interés</label>
          <input className="input" value={values.unitInterest} onChange={(e) => set("unitInterest", e.target.value)} placeholder="Ej. Depa 2 recámaras" />
        </div>
        <div>
          <label className="label">Presupuesto</label>
          <input type="number" className="input" value={values.budget} onChange={(e) => set("budget", e.target.value)} placeholder="$" />
        </div>
        <div>
          <label className="label">Valor estimado de la operación</label>
          <input type="number" className="input" value={values.estimatedValue} onChange={(e) => set("estimatedValue", e.target.value)} placeholder="$" />
        </div>
        <div>
          <label className="label">Forma de pago</label>
          <input className="input" value={values.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} placeholder="Contado, crédito, Infonavit..." />
        </div>
        {values.sourceType === "ASESOR_EXTERNO" && (
          <>
            <div>
              <label className="label">Empresa inmobiliaria</label>
              <select className="input" value={values.companyId} onChange={(e) => set("companyId", e.target.value)}>
                <option value="">Sin especificar</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.commercialName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Asesor externo</label>
              <select className="input" value={values.advisorId} onChange={(e) => set("advisorId", e.target.value)}>
                <option value="">Sin especificar</option>
                {advisors.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="label">Próxima acción</label>
          <input className="input" value={values.nextAction} onChange={(e) => set("nextAction", e.target.value)} placeholder="Ej. Llamar para agendar visita" />
        </div>
        <div>
          <label className="label">Fecha del próximo seguimiento</label>
          <input type="date" className="input" value={values.nextActionDate} onChange={(e) => set("nextActionDate", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Notas</label>
          <textarea className="input" rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((t: any) => (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTag(t.id)}
                className="badge border"
                style={{
                  backgroundColor: values.tagIds.includes(t.id) ? `${t.color}22` : "transparent",
                  borderColor: t.color,
                  color: t.color,
                }}
              >
                #{t.name}
              </button>
            ))}
            {tags.length === 0 && <span className="text-xs text-gray-400">No hay tags. Créalos en Configuración.</span>}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="submit" disabled={saving} className="btn-gold">
          {saving ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
