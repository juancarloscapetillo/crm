"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { PageHeader, Modal, StageBadge, ConfirmDialog } from "@/components/ui";
import { useFetch } from "@/lib/hooks";
import { formatCurrency, formatPercent, formatDate } from "@/lib/labels";

export default function EmpresaProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, reload } = useFetch<{ company: any }>(`/api/companies/${id}`);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const company = data?.company;
  const [form, setForm] = useState<any>(null);

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/asesores");
    }
  }

  function openEdit() {
    setForm({
      commercialName: company.commercialName,
      legalName: company.legalName || "",
      contactName: company.contactName || "",
      phone: company.phone || "",
      email: company.email || "",
      address: company.address || "",
      notes: company.notes || "",
      active: company.active,
    });
    setShowEdit(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success("Empresa actualizada");
    setShowEdit(false);
    reload();
  }

  async function handleDelete() {
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error((await res.json()).error || "No se pudo eliminar");
      return;
    }
    toast.success("Inmobiliaria eliminada");
    router.push("/asesores");
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando...</div>;
  if (!company) return <div className="p-6 text-sm text-gray-500">Empresa no encontrada.</div>;

  return (
    <div>
      <PageHeader
        title={company.commercialName}
        subtitle={company.legalName || undefined}
        onBack={handleBack}
        actions={
          <div className="flex items-center gap-2">
            <button className="btn-secondary" onClick={openEdit}>Editar</button>
            <button className="btn-danger" onClick={() => setShowDelete(true)} title="Eliminar inmobiliaria">
              <Trash2 size={15} />
            </button>
          </div>
        }
      />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card p-4 text-center">
            <div className="text-xl font-semibold text-calume-navy">{company.advisors.length}</div>
            <div className="text-xs text-gray-500">Asesores</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xl font-semibold text-calume-navy">{company.stats.prospectCount}</div>
            <div className="text-xs text-gray-500">Prospectos generados</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xl font-semibold text-calume-navy">{company.stats.salesCount}</div>
            <div className="text-xs text-gray-500">Ventas generadas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xl font-semibold text-calume-navy">{formatPercent(company.stats.conversion)}</div>
            <div className="text-xs text-gray-500">Conversión</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xl font-semibold text-calume-navy">{formatCurrency(company.stats.revenue)}</div>
            <div className="text-xs text-gray-500">Valor vendido</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Datos de contacto</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Contacto</dt><dd>{company.contactName || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Teléfono</dt><dd>{company.phone || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Correo</dt><dd>{company.email || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Dirección</dt><dd className="text-right">{company.address || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Estatus</dt><dd>{company.active ? "Activa" : "Inactiva"}</dd></div>
            </dl>
            {company.notes && <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100 whitespace-pre-wrap">{company.notes}</p>}
          </div>

          <div className="lg:col-span-2 card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Asesores de esta empresa</h3>
            <div className="space-y-2">
              {company.advisors.length === 0 && <p className="text-xs text-gray-400">Sin asesores registrados.</p>}
              {company.advisors.map((a: any) => (
                <Link key={a.id} href={`/asesores/${a.id}`} className="flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 text-sm">
                  <span>{a.name}</span>
                  <span className={`badge ${a.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{a.active ? "Activo" : "Inactivo"}</span>
                </Link>
              ))}
            </div>

            <h3 className="text-sm font-semibold text-gray-900 mb-3 mt-6">Prospectos generados</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {company.prospects.map((p: any) => (
                <Link key={p.id} href={`/prospectos/${p.id}`} className="flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 text-sm">
                  <div>
                    <div>{p.name}</div>
                    <div className="text-xs text-gray-400">{formatDate(p.entryDate)} · {p.assignedUser?.name}</div>
                  </div>
                  <StageBadge stage={p.stage} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {form && (
        <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar empresa">
          <form onSubmit={saveEdit} className="space-y-3">
            <div>
              <label className="label">Nombre comercial</label>
              <input className="input" value={form.commercialName} onChange={(e) => setForm({ ...form, commercialName: e.target.value })} />
            </div>
            <div>
              <label className="label">Razón social</label>
              <input className="input" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
            </div>
            <div>
              <label className="label">Contacto principal</label>
              <input className="input" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Teléfono</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Correo</label>
                <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Dirección</label>
              <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="label">Notas</label>
              <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Empresa activa
            </label>
            <button type="submit" className="btn-gold w-full">Guardar cambios</button>
          </form>
        </Modal>
      )}

      <ConfirmDialog
        open={showDelete}
        title="Eliminar inmobiliaria"
        message="Esta acción no se puede deshacer. Los asesores y prospectos ligados a esta empresa no se eliminarán, pero quedarán sin inmobiliaria asignada."
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
