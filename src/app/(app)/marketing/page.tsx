"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, Modal, StatCard, EmptyState, ConfirmDialog, DemoBadge } from "@/components/ui";
import { useFetch, useCatalogs } from "@/lib/hooks";
import { formatCurrency, formatDate, formatPercent } from "@/lib/labels";

const emptyForm = {
  date: new Date().toISOString().slice(0, 10),
  projectId: "",
  campaign: "",
  channel: "",
  provider: "",
  amount: "",
  description: "",
  leadsGenerated: "",
  visitsGenerated: "",
  salesAttributed: "",
  revenueAttributed: "",
};

export default function MarketingPage() {
  const [includeDemo, setIncludeDemo] = useState(false);
  const { data, loading, reload } = useFetch<{ records: any[] }>(`/api/marketing?includeDemo=${includeDemo}`, [includeDemo]);
  const { projects } = useCatalogs();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const records = data?.records || [];

  const totals = useMemo(() => {
    const amount = records.reduce((s, r) => s + r.amount, 0);
    const leads = records.reduce((s, r) => s + r.leadsGenerated, 0);
    const visits = records.reduce((s, r) => s + r.visitsGenerated, 0);
    const sales = records.reduce((s, r) => s + r.salesAttributed, 0);
    const revenue = records.reduce((s, r) => s + r.revenueAttributed, 0);
    return {
      amount, leads, visits, sales, revenue,
      cac: sales > 0 ? amount / sales : null,
      costPerLead: leads > 0 ? amount / leads : null,
      costPerVisit: visits > 0 ? amount / visits : null,
      costPerSale: sales > 0 ? amount / sales : null,
      conversion: leads > 0 ? sales / leads : null,
      roi: amount > 0 && revenue > 0 ? (revenue - amount) / amount : null,
    };
  }, [records]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.campaign.trim() || !form.channel.trim() || !form.amount) {
      toast.error("Campaña, canal y monto son obligatorios");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error);
      return;
    }
    toast.success("Registro de inversión creado");
    setShowCreate(false);
    setForm(emptyForm);
    reload();
  }

  async function handleDelete() {
    if (!toDelete) return;
    const res = await fetch(`/api/marketing/${toDelete}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Registro eliminado");
      reload();
    }
    setToDelete(null);
  }

  return (
    <div>
      <PageHeader
        title="Inversión en marketing"
        subtitle="Captura tu inversión por campaña y canal para calcular CAC y retorno"
        actions={
          <button className="btn-gold" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nuevo registro
          </button>
        }
      />
      <div className="p-4 sm:p-6 space-y-6">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={includeDemo} onChange={(e) => setIncludeDemo(e.target.checked)} />
          Incluir datos demostrativos
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard label="Inversión total" value={formatCurrency(totals.amount)} accent="gold" />
          <StatCard label="CAC" value={totals.cac !== null ? formatCurrency(totals.cac) : "Datos insuficientes"} />
          <StatCard label="Costo por lead" value={totals.costPerLead !== null ? formatCurrency(totals.costPerLead) : "Datos insuficientes"} />
          <StatCard label="Costo por visita" value={totals.costPerVisit !== null ? formatCurrency(totals.costPerVisit) : "Datos insuficientes"} />
          <StatCard label="Conversión lead→venta" value={formatPercent(totals.conversion)} />
          <StatCard label="ROI" value={totals.roi !== null ? formatPercent(totals.roi) : "Datos insuficientes"} hint={totals.roi === null ? "Falta ingreso atribuido" : undefined} />
        </div>

        {loading && <p className="text-sm text-gray-500">Cargando...</p>}
        {!loading && records.length === 0 && <EmptyState title="Aún no hay registros de inversión" />}

        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-left px-3 py-2">Campaña</th>
                <th className="text-left px-3 py-2">Canal</th>
                <th className="text-left px-3 py-2">Proyecto</th>
                <th className="text-right px-3 py-2">Invertido</th>
                <th className="text-right px-3 py-2">Leads</th>
                <th className="text-right px-3 py-2">Visitas</th>
                <th className="text-right px-3 py-2">Ventas</th>
                <th className="text-right px-3 py-2">CAC</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">{formatDate(r.date)}</td>
                  <td className="px-3 py-2">
                    {r.campaign} {r.isDemo && <DemoBadge />}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{r.channel}</td>
                  <td className="px-3 py-2 text-gray-500">{r.project?.name || "—"}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.amount)}</td>
                  <td className="px-3 py-2 text-right">{r.leadsGenerated}</td>
                  <td className="px-3 py-2 text-right">{r.visitsGenerated}</td>
                  <td className="px-3 py-2 text-right">{r.salesAttributed}</td>
                  <td className="px-3 py-2 text-right">
                    {r.salesAttributed > 0 ? formatCurrency(r.amount / r.salesAttributed) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => setToDelete(r.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo registro de inversión" wide>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha *</label>
            <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label className="label">Proyecto</label>
            <select className="input" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
              <option value="">General</option>
              {projects.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Campaña *</label>
            <input className="input" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} required />
          </div>
          <div>
            <label className="label">Canal *</label>
            <input className="input" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="Facebook Ads, Google Ads..." required />
          </div>
          <div>
            <label className="label">Proveedor / agencia</label>
            <input className="input" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
          </div>
          <div>
            <label className="label">Monto invertido *</label>
            <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div>
            <label className="label">Leads generados</label>
            <input type="number" className="input" value={form.leadsGenerated} onChange={(e) => setForm({ ...form, leadsGenerated: e.target.value })} />
          </div>
          <div>
            <label className="label">Visitas generadas</label>
            <input type="number" className="input" value={form.visitsGenerated} onChange={(e) => setForm({ ...form, visitsGenerated: e.target.value })} />
          </div>
          <div>
            <label className="label">Ventas atribuidas</label>
            <input type="number" className="input" value={form.salesAttributed} onChange={(e) => setForm({ ...form, salesAttributed: e.target.value })} />
          </div>
          <div>
            <label className="label">Ingreso atribuido</label>
            <input type="number" className="input" value={form.revenueAttributed} onChange={(e) => setForm({ ...form, revenueAttributed: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Descripción</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-gold">
              {saving ? "Guardando..." : "Guardar registro"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar registro"
        message="¿Deseas eliminar este registro de inversión?"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
