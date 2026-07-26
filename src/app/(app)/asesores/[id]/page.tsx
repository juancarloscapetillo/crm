"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { PageHeader, Modal, StageBadge } from "@/components/ui";
import { useFetch, useCatalogs } from "@/lib/hooks";
import { formatCurrency, formatPercent, formatDate } from "@/lib/labels";

export default function AsesorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, loading, reload } = useFetch<{ advisor: any }>(`/api/advisors/${id}`);
  const { companies } = useCatalogs();
  const [showEdit, setShowEdit] = useState(false);
  const advisor = data?.advisor;
  const [form, setForm] = useState<any>(null);

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/asesores");
    }
  }

  function openEdit() {
    setForm({ name: advisor.name, phone: advisor.phone || "", email: advisor.email || "", companyId: advisor.companyId || "", active: advisor.active });
    setShowEdit(true);
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/advisors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      toast.error("No se pudo guardar");
      return;
    }
    toast.success("Asesor actualizado");
    setShowEdit(false);
    reload();
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Cargando...</div>;
  if (!advisor) return <div className="p-6 text-sm text-gray-500">Asesor no encontrado.</div>;

  return (
    <div>
      <PageHeader
        title={advisor.name}
        subtitle={advisor.company ? `${advisor.company.commercialName}` : "Asesor independiente"}
        onBack={handleBack}
        actions={<button className="btn-secondary" onClick={openEdit}>Editar</button>}
      />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <div className="text-xl font-semibold text-calume-navy">{advisor.stats.prospectCount}</div>
            <div className="text-xs text-gray-500">Prospectos registrados</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xl font-semibold text-calume-navy">{advisor.stats.activeProspectCount}</div>
            <div className="text-xs text-gray-500">Prospectos activos</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xl font-semibold text-calume-navy">{advisor.stats.visitsGenerated}</div>
            <div className="text-xs text-gray-500">Visitas generadas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xl font-semibold text-calume-navy">{advisor.stats.salesCount}</div>
            <div className="text-xs text-gray-500">Ventas ganadas</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xl font-semibold text-calume-navy">{formatPercent(advisor.stats.conversion)}</div>
            <div className="text-xs text-gray-500">Tasa de conversión</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-xl font-semibold text-calume-navy">{formatCurrency(advisor.stats.revenue)}</div>
            <div className="text-xs text-gray-500">Valor vendido</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Datos de contacto</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-gray-500">Teléfono</dt><dd>{advisor.phone || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Correo</dt><dd>{advisor.email || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Registrado</dt><dd>{formatDate(advisor.registeredAt)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Estatus</dt><dd>{advisor.active ? "Activo" : "Inactivo"}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Empresa</dt><dd>{advisor.company?.commercialName || "Independiente"}</dd></div>
            </dl>
          </div>

          <div className="lg:col-span-2 card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Prospectos generados</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {advisor.prospects.length === 0 && <p className="text-xs text-gray-400">Sin prospectos registrados.</p>}
              {advisor.prospects.map((p: any) => (
                <Link key={p.id} href={`/prospectos/${p.id}`} className="flex items-center justify-between px-2 py-2 rounded hover:bg-gray-50 text-sm">
                  <div>
                    <div>{p.name}</div>
                    <div className="text-xs text-gray-400">{formatDate(p.entryDate)} · {p.project?.name || "Sin proyecto"}</div>
                  </div>
                  <StageBadge stage={p.stage} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {form && (
        <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar asesor">
          <form onSubmit={saveEdit} className="space-y-3">
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
              <label className="label">Empresa</label>
              <select className="input" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
                <option value="">Independiente</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.commercialName}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              Asesor activo
            </label>
            <button type="submit" className="btn-gold w-full">Guardar cambios</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
