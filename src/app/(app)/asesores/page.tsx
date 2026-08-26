"use client";

import { useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { Plus, UserCog, Building2, AlertTriangle } from "lucide-react";
import { PageHeader, Modal, EmptyState } from "@/components/ui";
import { useFetch } from "@/lib/hooks";
import { formatCurrency, formatPercent } from "@/lib/labels";
import { DAYS_WITHOUT_ACTIVE_WARNING } from "@/lib/alert";

function DaysSinceActiveCell({ days }: { days: number | null }) {
  if (days === null) return <span className="text-gray-400">—</span>;
  const warn = days > DAYS_WITHOUT_ACTIVE_WARNING;
  return (
    <span className={`inline-flex items-center gap-1 ${warn ? "text-alert-red font-medium" : "text-gray-600"}`}>
      {warn && <AlertTriangle size={13} />}
      {days} {days === 1 ? "día" : "días"}
    </span>
  );
}

const tabs = [
  { key: "asesores", label: "Asesores" },
  { key: "inmobiliarias", label: "Inmobiliarias" },
];

function matchesEstatus(activeCount: number, filter: string) {
  if (filter === "activo") return activeCount > 0;
  if (filter === "inactivo") return activeCount === 0;
  return true;
}

function matchesAlerta(days: number | null, filter: string) {
  const hasAlert = days !== null && days > DAYS_WITHOUT_ACTIVE_WARNING;
  if (filter === "con") return hasAlert;
  if (filter === "sin") return !hasAlert;
  return true;
}

export default function AsesoresPage() {
  const [tab, setTab] = useState<"asesores" | "inmobiliarias">("asesores");

  const { data, loading, reload } = useFetch<{ advisors: any[] }>("/api/advisors");
  const { data: companiesData, loading: loadingCompanies, reload: reloadCompanies } = useFetch<{ companies: any[] }>("/api/companies");
  const companies = companiesData?.companies || [];
  const [showCreate, setShowCreate] = useState(false);

  const [estatusFilter, setEstatusFilter] = useState("");
  const [alertaFilter, setAlertaFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", companyId: "" });
  const [saving, setSaving] = useState(false);

  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState({ commercialName: "", phone: "", email: "" });
  const [savingCompany, setSavingCompany] = useState(false);

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

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!companyForm.commercialName.trim()) {
      toast.error("El nombre comercial es obligatorio");
      return;
    }
    setSavingCompany(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(companyForm),
    });
    setSavingCompany(false);
    if (!res.ok) {
      toast.error((await res.json()).error);
      return;
    }
    toast.success("Inmobiliaria creada");
    setShowCreateCompany(false);
    setCompanyForm({ commercialName: "", phone: "", email: "" });
    reloadCompanies();
  }

  const advisors = data?.advisors || [];

  const filteredAdvisors = advisors.filter(
    (a) =>
      matchesEstatus(a.activeProspectCount, estatusFilter) &&
      matchesAlerta(a.daysSinceActiveProspect, alertaFilter) &&
      (!companyFilter || a.company?.id === companyFilter)
  );
  const filteredCompanies = companies.filter(
    (c: any) => matchesEstatus(c.activeProspectCount, estatusFilter) && matchesAlerta(c.daysSinceActiveProspect, alertaFilter)
  );
  const filtersActive = !!estatusFilter || !!alertaFilter || !!companyFilter;

  return (
    <div>
      <PageHeader
        title={tab === "asesores" ? "Asesores externos" : "Inmobiliarias"}
        subtitle={
          tab === "asesores"
            ? "Asesores inmobiliarios que generan prospectos para Calume"
            : "Empresas inmobiliarias con las que trabajan tus asesores externos"
        }
        actions={
          tab === "asesores" ? (
            <button className="btn-gold" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Nuevo asesor
            </button>
          ) : (
            <button className="btn-gold" onClick={() => setShowCreateCompany(true)}>
              <Building2 size={16} /> Nueva inmobiliaria
            </button>
          )
        }
      />
      <div className="px-4 sm:px-6 pt-4">
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as "asesores" | "inmobiliarias")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === t.key ? "border-calume-navy text-calume-navy" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 pt-4">
        <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-xl2 p-3">
          <div>
            <label className="label">Estatus</label>
            <select className="input" value={estatusFilter} onChange={(e) => setEstatusFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div>
            <label className="label">Alerta</label>
            <select className="input" value={alertaFilter} onChange={(e) => setAlertaFilter(e.target.value)}>
              <option value="">Todos</option>
              <option value="con">Con alerta (+{DAYS_WITHOUT_ACTIVE_WARNING} días)</option>
              <option value="sin">Sin alerta</option>
            </select>
          </div>
          {tab === "asesores" && (
            <div>
              <label className="label">Empresa / Inmobiliaria</label>
              <select className="input" value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
                <option value="">Todas</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.commercialName}</option>
                ))}
              </select>
            </div>
          )}
          {filtersActive && (
            <button
              className="text-sm text-gray-500 hover:text-calume-navy underline pb-2"
              onClick={() => {
                setEstatusFilter("");
                setAlertaFilter("");
                setCompanyFilter("");
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {tab === "asesores" ? (
        <div className="p-4 sm:p-6">
          {loading && <p className="text-sm text-gray-500">Cargando...</p>}
          {!loading && advisors.length === 0 && (
            <EmptyState icon={<UserCog size={40} />} title="Aún no hay asesores registrados" />
          )}
          {!loading && advisors.length > 0 && filteredAdvisors.length === 0 && (
            <EmptyState icon={<UserCog size={40} />} title="Ningún asesor coincide con estos filtros" />
          )}
          {!loading && filteredAdvisors.length > 0 && (
            <div className="overflow-x-auto card">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">Nombre</th>
                    <th className="text-left px-4 py-2">Empresa</th>
                    <th className="text-center px-4 py-2">Estatus</th>
                    <th className="text-center px-4 py-2">Prospectos</th>
                    <th className="text-center px-4 py-2">Prospectos activos</th>
                    <th className="text-center px-4 py-2">Días sin prospecto activo</th>
                    <th className="text-center px-4 py-2">Ventas</th>
                    <th className="text-center px-4 py-2">Conversión</th>
                    <th className="text-center px-4 py-2">Valor vendido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAdvisors.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link href={`/asesores/${a.id}`} className="text-calume-navy font-medium hover:underline">
                          {a.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-gray-500">{a.company?.name || "—"}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`badge ${a.activeProspectCount > 0 ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {a.activeProspectCount > 0 ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">{a.prospectCount}</td>
                      <td className="px-4 py-2 text-center">{a.activeProspectCount}</td>
                      <td className="px-4 py-2 text-center">
                        <DaysSinceActiveCell days={a.daysSinceActiveProspect} />
                      </td>
                      <td className="px-4 py-2 text-center">{a.salesCount}</td>
                      <td className="px-4 py-2 text-center">{formatPercent(a.conversion)}</td>
                      <td className="px-4 py-2 text-center">{formatCurrency(a.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 sm:p-6">
          {loadingCompanies && <p className="text-sm text-gray-500">Cargando...</p>}
          {!loadingCompanies && companies.length === 0 && (
            <EmptyState icon={<Building2 size={40} />} title="Aún no hay inmobiliarias registradas" />
          )}
          {!loadingCompanies && companies.length > 0 && filteredCompanies.length === 0 && (
            <EmptyState icon={<Building2 size={40} />} title="Ninguna inmobiliaria coincide con estos filtros" />
          )}
          {!loadingCompanies && filteredCompanies.length > 0 && (
            <div className="overflow-x-auto card">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-2">Nombre comercial</th>
                    <th className="text-center px-4 py-2">Estatus</th>
                    <th className="text-center px-4 py-2">Asesores</th>
                    <th className="text-center px-4 py-2">Prospectos</th>
                    <th className="text-center px-4 py-2">Prospectos activos</th>
                    <th className="text-center px-4 py-2">Días sin prospecto activo</th>
                    <th className="text-center px-4 py-2">Ventas</th>
                    <th className="text-center px-4 py-2">Conversión</th>
                    <th className="text-center px-4 py-2">Valor vendido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredCompanies.map((c: any) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link href={`/empresas/${c.id}`} className="text-calume-navy font-medium hover:underline">
                          {c.commercialName}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className={`badge ${c.activeProspectCount > 0 ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {c.activeProspectCount > 0 ? "Activa" : "Inactiva"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">{c.advisorCount}</td>
                      <td className="px-4 py-2 text-center">{c.prospectCount}</td>
                      <td className="px-4 py-2 text-center">{c.activeProspectCount}</td>
                      <td className="px-4 py-2 text-center">
                        <DaysSinceActiveCell days={c.daysSinceActiveProspect} />
                      </td>
                      <td className="px-4 py-2 text-center">{c.salesCount}</td>
                      <td className="px-4 py-2 text-center">{formatPercent(c.conversion)}</td>
                      <td className="px-4 py-2 text-center">{formatCurrency(c.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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

      <Modal open={showCreateCompany} onClose={() => setShowCreateCompany(false)} title="Nueva inmobiliaria">
        <form onSubmit={handleCreateCompany} className="space-y-3">
          <div>
            <label className="label">Nombre comercial *</label>
            <input
              className="input"
              value={companyForm.commercialName}
              onChange={(e) => setCompanyForm({ ...companyForm, commercialName: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Correo</label>
              <input className="input" value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={savingCompany} className="btn-gold w-full">
            {savingCompany ? "Guardando..." : "Crear inmobiliaria"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
