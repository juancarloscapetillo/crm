"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, Building2 } from "lucide-react";
import { PageHeader, Modal, EmptyState } from "@/components/ui";
import { useFetch } from "@/lib/hooks";
import { formatCurrency, formatPercent } from "@/lib/labels";

export default function EmpresasPage() {
  const { data, loading, reload } = useFetch<{ companies: any[] }>("/api/companies");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ commercialName: "", legalName: "", contactName: "", phone: "", email: "", address: "" });
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.commercialName.trim()) {
      toast.error("El nombre comercial es obligatorio");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error);
      return;
    }
    toast.success("Empresa creada");
    setShowCreate(false);
    setForm({ commercialName: "", legalName: "", contactName: "", phone: "", email: "", address: "" });
    reload();
  }

  const companies = data?.companies || [];

  return (
    <div>
      <PageHeader
        title="Empresas inmobiliarias"
        subtitle="Alianzas comerciales y empresas de asesores externos"
        actions={
          <button className="btn-gold" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nueva empresa
          </button>
        }
      />
      <div className="p-4 sm:p-6">
        {loading && <p className="text-sm text-gray-500">Cargando...</p>}
        {!loading && companies.length === 0 && (
          <EmptyState icon={<Building2 size={40} />} title="Aún no hay empresas registradas" description="Registra las inmobiliarias con las que colabora Calume." />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c) => (
            <Link key={c.id} href={`/empresas/${c.id}`} className="card p-4 hover:shadow-popover transition-shadow">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-gray-900">{c.commercialName}</h3>
                <span className={`badge ${c.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {c.active ? "Activa" : "Inactiva"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{c.contactName || "Sin contacto principal"}</p>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div>
                  <div className="text-sm font-semibold text-calume-navy">{c.advisorCount}</div>
                  <div className="text-[10px] text-gray-400">Asesores</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-calume-navy">{c.prospectCount}</div>
                  <div className="text-[10px] text-gray-400">Prospectos</div>
                </div>
                <div>
                  <div className="text-sm font-semibold text-calume-navy">{formatPercent(c.conversion)}</div>
                  <div className="text-[10px] text-gray-400">Conversión</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nueva empresa">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="label">Nombre comercial *</label>
            <input className="input" value={form.commercialName} onChange={(e) => setForm({ ...form, commercialName: e.target.value })} required />
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
          <button type="submit" disabled={saving} className="btn-gold w-full">
            {saving ? "Guardando..." : "Crear empresa"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
