"use client";

import { useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import FilterBar, { Filters } from "@/components/FilterBar";
import { useCatalogs, useFetch } from "@/lib/hooks";
import { toQueryString } from "@/lib/queryString";
import { formatCurrency, formatPercent } from "@/lib/labels";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";

const PIE_COLORS = ["#253574", "#F6B436", "#5B8DEF", "#9B6FD9", "#3FBE7A", "#E15B5B", "#F0B429"];

type DashboardData = {
  kpis: {
    nuevos: number; activos: number; ganados: number; perdidos: number;
    conversion: number | null; ventasGanadas: number; inversionMarketing: number;
    cac: number | null; asesoresRegistrados: number; asesoresActivos: number; sinSeguimiento: number;
  };
  distribution: {
    tags: { name: string; color: string; count: number }[];
    vendors: { name: string; count: number }[];
    stages: { name: string; count: number }[];
  };
  evolution: { label: string; nuevos: number; ganados: number }[];
};

export default function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({ range: "todo" });
  const { tags, projects, users } = useCatalogs();
  const qs = toQueryString(filters as any);
  const { data, loading } = useFetch<DashboardData>(`/api/dashboard${qs}`, [qs]);

  return (
    <div>
      <PageHeader title="Dashboard ejecutivo" subtitle="Visión general del embudo comercial de Calume" />
      <div className="p-4 sm:p-6 space-y-6">
        <FilterBar filters={filters} onChange={setFilters} users={users} tags={tags} projects={projects} />

        {loading && <p className="text-sm text-gray-500">Cargando indicadores...</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard label="Prospectos nuevos" value={data.kpis.nuevos} />
              <StatCard label="Prospectos activos" value={data.kpis.activos} accent="gold" />
              <StatCard label="Prospectos ganados" value={data.kpis.ganados} accent="green" />
              <StatCard label="Prospectos perdidos" value={data.kpis.perdidos} accent="red" />
              <StatCard label="Tasa de conversión" value={formatPercent(data.kpis.conversion)} />
              <StatCard label="Ventas ganadas" value={formatCurrency(data.kpis.ventasGanadas)} accent="green" />
              <StatCard label="Inversión en marketing" value={formatCurrency(data.kpis.inversionMarketing)} accent="gold" />
              <StatCard
                label="CAC (costo de adquisición)"
                value={data.kpis.cac !== null ? formatCurrency(data.kpis.cac) : "Datos insuficientes"}
                hint={data.kpis.cac === null ? "No hay ventas ganadas en el periodo" : undefined}
              />
              <StatCard label="Asesores registrados" value={data.kpis.asesoresRegistrados} />
              <StatCard label="Asesores activos" value={data.kpis.asesoresActivos} accent="green" />
              <StatCard
                label="Prospectos sin seguimiento"
                value={data.kpis.sinSeguimiento}
                accent="red"
                hint="72h o más sin movimiento"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Evolución de prospectos y ventas</h3>
                {data.evolution.length === 0 ? (
                  <EmptyState title="Sin datos en este periodo" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={data.evolution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="nuevos" name="Nuevos" stroke="#253574" strokeWidth={2} />
                      <Line type="monotone" dataKey="ganados" name="Ganados" stroke="#3FBE7A" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribución por etapa</h3>
                {data.distribution.stages.length === 0 ? (
                  <EmptyState title="Sin datos en este periodo" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.distribution.stages} dataKey="count" nameKey="name" outerRadius={90} label={(e) => `${e.name}: ${e.count}`}>
                        {data.distribution.stages.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribución por vendedor</h3>
                {data.distribution.vendors.length === 0 ? (
                  <EmptyState title="Sin datos en este periodo" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.distribution.vendors}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Prospectos" fill="#253574" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Distribución por tag</h3>
                {data.distribution.tags.length === 0 ? (
                  <EmptyState title="Sin tags asignados en este periodo" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data.distribution.tags} dataKey="count" nameKey="name" outerRadius={90} label={(e) => `#${e.name}: ${e.count}`}>
                        {data.distribution.tags.map((t, i) => (
                          <Cell key={i} fill={t.color || PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
