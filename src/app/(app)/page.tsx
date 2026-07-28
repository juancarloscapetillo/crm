"use client";

import { useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Download, FileSpreadsheet, Printer, FileText, Home, Handshake, Lock, Trophy } from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import FilterBar, { Filters } from "@/components/FilterBar";
import { useCatalogs, useFetch } from "@/lib/hooks";
import { toQueryString } from "@/lib/queryString";
import { formatCurrency, formatPercent, stageColors } from "@/lib/labels";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { Stage } from "@prisma/client";

const FUNNEL_ICONS: Partial<Record<Stage, any>> = {
  INFORMES: FileText,
  VISITA: Home,
  NEGOCIACION: Handshake,
  APARTADO: Lock,
  GANADO: Trophy,
};

// Fixed decorative widths per funnel position — the shape never changes
// with the data, only the numbers in the table do.
const FUNNEL_BAND_WIDTHS = [100, 84, 68, 52, 36];

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
  funnel: {
    stage: Stage; label: string; total: number;
    percentVsPrevious: number | null; percentAccumulated: number | null;
  }[];
};

export default function DashboardPage() {
  const [filters, setFilters] = useState<Filters>({ range: "todo" });
  const { tags, projects, users } = useCatalogs();
  const qs = toQueryString(filters as any);
  const { data, loading } = useFetch<DashboardData>(`/api/dashboard${qs}`, [qs]);
  const { data: reportData, loading: reportLoading } = useFetch<any>(`/api/reports${qs}`, [qs]);

  function handleExportExcel() {
    if (!reportData) return;
    exportToExcel("calume-reportes", [
      { name: "Resumen", rows: [reportData.summary] },
      { name: "Por etapa", rows: reportData.byStage },
      { name: "Motivos de pérdida", rows: reportData.lossReasons },
      { name: "Por vendedor", rows: reportData.byVendor },
      { name: "Por asesor", rows: reportData.byAdvisor },
      { name: "Por empresa", rows: reportData.byCompany },
      { name: "Por tag", rows: reportData.byTag },
      { name: "Por canal", rows: reportData.byChannel },
      { name: "Marketing por periodo", rows: reportData.byPeriod },
      { name: "Productividad", rows: reportData.productivity },
    ]);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Visión general del embudo comercial y reportes exportables de Calume"
        actions={
          <div className="flex gap-2 no-print">
            <button className="btn-secondary" onClick={() => reportData && exportToCSV("calume-resumen", [reportData.summary])}>
              <Download size={15} /> CSV
            </button>
            <button className="btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet size={15} /> Excel
            </button>
            <button className="btn-secondary" onClick={handlePrint}>
              <Printer size={15} /> Imprimir / PDF
            </button>
          </div>
        }
      />
      <div className="p-4 sm:p-6 space-y-6">
        <div className="no-print">
          <FilterBar filters={filters} onChange={setFilters} users={users} tags={tags} projects={projects} />
        </div>

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
              {reportData && (
                <>
                  <StatCard label="Valor del pipeline" value={formatCurrency(reportData.summary.valorPipeline)} />
                  <StatCard label="Tiempo promedio de cierre" value={reportData.summary.avgCloseTimeDays !== null ? `${reportData.summary.avgCloseTimeDays.toFixed(1)} días` : "Datos insuficientes"} />
                  <StatCard label="Tiempo promedio sin seguimiento" value={reportData.summary.avgNoFollowHours !== null ? `${reportData.summary.avgNoFollowHours.toFixed(0)} h` : "Datos insuficientes"} />
                </>
              )}
            </div>

            <ConversionFunnel funnel={data.funnel} />

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

        {reportLoading && <p className="text-sm text-gray-500">Calculando reportes...</p>}

        {reportData && (
          <>
            <ReportTable
              title="Prospectos por etapa"
              columns={["Etapa", "Prospectos"]}
              rows={reportData.byStage.map((r: any) => [r.stage, r.count])}
            />

            <ReportTable
              title="Motivos de pérdida"
              columns={["Motivo", "Prospectos"]}
              rows={reportData.lossReasons.map((r: any) => [r.reason, r.count])}
              empty="No hay prospectos perdidos en este periodo"
            />

            <ReportTable
              title="Conversión por vendedor"
              columns={["Vendedor", "Total", "Ganados", "Conversión", "Valor ganado"]}
              rows={reportData.byVendor.map((r: any) => [r.name, r.total, r.won, formatPercent(r.conversion), formatCurrency(r.value)])}
            />

            <ReportTable
              title="Conversión por asesor externo"
              columns={["Asesor", "Empresa", "Total", "Ganados", "Conversión", "Valor ganado"]}
              rows={reportData.byAdvisor.map((r: any) => [r.name, r.company, r.total, r.won, formatPercent(r.conversion), formatCurrency(r.value)])}
              empty="No hay prospectos de asesores externos en este periodo"
            />

            <ReportTable
              title="Conversión por empresa inmobiliaria"
              columns={["Empresa", "Total", "Ganados", "Conversión", "Valor ganado"]}
              rows={reportData.byCompany.map((r: any) => [r.name, r.total, r.won, formatPercent(r.conversion), formatCurrency(r.value)])}
              empty="No hay prospectos vinculados a empresas en este periodo"
            />

            <ReportTable
              title="Conversión por tag"
              columns={["Tag", "Total", "Ganados", "Conversión"]}
              rows={reportData.byTag.map((r: any) => [`#${r.name}`, r.total, r.won, formatPercent(r.conversion)])}
            />

            <ReportTable
              title="Conversión por canal"
              columns={["Canal", "Total", "Ganados", "Conversión"]}
              rows={reportData.byChannel.map((r: any) => [r.name, r.total, r.won, formatPercent(r.conversion)])}
            />

            <ReportTable
              title="Inversión y CAC por periodo"
              columns={["Periodo", "Inversión", "Leads", "Ventas", "CAC"]}
              rows={reportData.byPeriod.map((r: any) => [r.period, formatCurrency(r.amount), r.leads, r.sales, r.cac !== null ? formatCurrency(r.cac) : "Datos insuficientes"])}
            />

            <ReportTable
              title="Productividad por vendedor"
              columns={["Vendedor", "Prospectos asignados", "Ganados", "Actividades registradas"]}
              rows={reportData.productivity.map((r: any) => [r.name, r.prospectsAssigned, r.won, r.activities])}
            />
          </>
        )}
      </div>
    </div>
  );
}

function stripEmoji(label: string) {
  return label.replace(/^\S+\s*/, "");
}

function ConversionFunnel({ funnel }: { funnel: DashboardData["funnel"] }) {
  const hasData = funnel.some((f) => f.total > 0);
  return (
    <div className="card p-5 break-inside-avoid">
      <h3 className="text-base font-bold text-gray-900">Embudo de conversión</h3>
      <p className="text-xs text-gray-500 mb-4">Conversión por etapa y acumulada</p>
      {!hasData ? (
        <EmptyState title="Sin datos en este periodo" />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,380px)_1fr] gap-6 items-center">
          <div className="flex flex-col items-center">
            {funnel.map((f, i) => {
              const Icon = FUNNEL_ICONS[f.stage];
              const widthPct = FUNNEL_BAND_WIDTHS[i] ?? FUNNEL_BAND_WIDTHS[FUNNEL_BAND_WIDTHS.length - 1];
              return (
                <div
                  key={f.stage}
                  className="flex items-center justify-center gap-2 text-white font-semibold text-sm py-4"
                  style={{
                    width: `${widthPct}%`,
                    background: stageColors[f.stage],
                    clipPath: "polygon(6% 0, 94% 0, 88% 100%, 12% 100%)",
                    marginTop: i === 0 ? 0 : -4,
                  }}
                >
                  {Icon && <Icon size={16} />}
                  {stripEmoji(f.label)}
                </div>
              );
            })}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-3 py-2">Etapa</th>
                  <th className="text-left px-3 py-2">Total</th>
                  <th className="text-left px-3 py-2">% vs etapa anterior</th>
                  <th className="text-left px-3 py-2">% acumulado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {funnel.map((f) => (
                  <tr key={f.stage}>
                    <td className="px-3 py-2 font-medium" style={{ color: stageColors[f.stage] }}>{stripEmoji(f.label)}</td>
                    <td className="px-3 py-2 font-semibold">{f.total}</td>
                    <td className="px-3 py-2">{formatPercent(f.percentVsPrevious)}</td>
                    <td className="px-3 py-2">{formatPercent(f.percentAccumulated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportTable({ title, columns, rows, empty }: { title: string; columns: string[]; rows: any[][]; empty?: string }) {
  return (
    <div className="card p-4 break-inside-avoid">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">{empty || "Sin datos para este periodo"}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>{columns.map((c) => <th key={c} className="text-left px-3 py-2">{c}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => <td key={j} className="px-3 py-1.5">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
