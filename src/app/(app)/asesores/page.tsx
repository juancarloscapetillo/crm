"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, UserCog } from "lucide-react";
import { PageHeader, Modal, EmptyState } from "@/components/ui";
import { useFetch, useCatalogs } from "@/lib/hooks";
import { formatCurrency, formatPercent } from "@/lib/labels";

export default function AsesoresPage() {
  const { data, loading, reload } = useFetch<{ advisors: any[] }>("/api/advisors");
  const { companies } = useCatalogs();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", companyId: "" });
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/advisors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error);
      return;
    }
    toast.success("Asesor creado");
    setShowCreate(false);
    setForm({ name: "", phone: "", email: "", companyId: "" });
    reload();
  }

  const advisors = data?.advisors || [];

  return (
    <div>
      <PageHeader
        title="Asesores externos"
        subtitle="Asesores inmobiliarios que generan prospectos para Calume"
        actions={
          <button className="btn-gold" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nuevo asesor
          </button>
        }
      />
      <div className="p-4 sm:p-6">
        {loading && <p className="text-sm text-gray-500">Cargando...</p>}
        {!loading && advisors.length === 0 && (
          <EmptyState icon={<UserCog size={40} />} title="Aún no hay asesores registrados" />
        )}
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Nombre</th>
                <th className="text-left px-4 py-2">Empresa</th>
                <th className="text-center px-4 py-2">Estatus</th>
                <th className="text-center px-4 py-2">Prospectos</th>
                <th className="text-center px-4 py-2">Ventas</th>
                <th className="text-center px-4 py-2">Conversión</th>
                <th className="text-center px-4 py-2">Valor vendido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {advisors.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link href={`/asesores/${a.id}`} className="text-calume-navy font-medium hover:underline">
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{a.company?.name || "—"}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`badge ${a.isActiveByActivity ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {a.isActiveByActivity ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">{a.prospectCount}</td>
                  <td className="px-4 py-2 text-center">{a.salesCount}</td>
                  <td className="px-4 py-2 text-center">{formatPercent(a.conversion)}</td>
                  <td className="px-4 py-2 text-center">{formatCurrency(a.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo asesor">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
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
            <label className="label">Empresa o inmobiliaria</label>
            <select className="input" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
              <option value="">Independiente</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.commercialName}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-gold w-full">
            {saving ? "Guardando..." : "Crear asesor"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
