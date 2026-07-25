"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { PageHeader, StatCard, EmptyState } from "@/components/ui";
import FilterBar, { Filters } from "@/components/FilterBar";
import { useCatalogs, useFetch } from "@/lib/hooks";
import { toQueryString } from "@/lib/queryString";
import { formatCurrency, formatPercent } from "@/lib/labels";
import { exportToCSV, exportToExcel } from "@/lib/export";

export default function ReportesPage() {
  const [filters, setFilters] = useState<Filters>({ range: "todo" });
  const { tags, projects, users } = useCatalogs();
  const qs = toQueryString(filters as any);
  const { data, loading } = useFetch<any>(`/api/reports${qs}`, [qs]);

  function handleExportExcel() {
    if (!data) return;
    exportToExcel("calume-reportes", [
      { name: "Resumen", rows: [data.summary] },
      { name: "Por etapa", rows: data.byStage },
      { name: "Motivos de pérdida", rows: data.lossReasons },
      { name: "Por vendedor", rows: data.byVendor },
      { name: "Por asesor", rows: data.byAdvisor },
      { name: "Por empresa", rows: data.byCompany },
      { name: "Por tag", rows: data.byTag },
      { name: "Por canal", rows: data.byChannel },
      { name: "Marketing por periodo", rows: data.byPeriod },
      { name: "Productividad", rows: data.productivity },
    ]);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      <PageHeader
        title="Reportes"
        subtitle="Indicadores comerciales y ejecutivos, exportables para tu equipo"
        actions={
          <div className="flex gap-2 no-print">
            <button className="btn-secondary" onClick={() => data && exportToCSV("calume-resumen", [data.summary])}>
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

        {loading && <p className="text-sm text-gray-500">Calculando reportes...</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard label="Prospectos nuevos" value={data.summary.nuevos} />
              <StatCard label="Activos" value={data.summary.activos} />
              <StatCard label="Ganados" value={data.summary.ganados} accent="green" />
              <StatCard label="Perdidos" value={data.summary.perdidos} accent="red" />
              <StatCard label="Valor del pipeline" value={formatCurrency(data.summary.valorPipeline)} />
              <StatCard label="Valor ganado" value={formatCurrency(data.summary.valorGanado)} accent="green" />
              <StatCard label="Inversión en marketing" value={formatCurrency(data.summary.inversionTotal)} accent="gold" />
              <StatCard label="CAC general" value={data.summary.cacGeneral !== null ? formatCurrency(data.summary.cacGeneral) : "Datos insuficientes"} />
              <StatCard label="Tiempo promedio de cierre" value={data.summary.avgCloseTimeDays !== null ? `${data.summary.avgCloseTimeDays.toFixed(1)} días` : "Datos insuficientes"} />
              <StatCard label="Tiempo promedio sin seguimiento" value={data.summary.avgNoFollowHours !== null ? `${data.summary.avgNoFollowHours.toFixed(0)} h` : "Datos insuficientes"} />
              <StatCard label="Asesores registrados" value={data.summary.asesoresRegistrados} />
            </div>

            <ReportTable
              title="Prospectos por etapa"
              columns={["Etapa", "Prospectos"]}
              rows={data.byStage.map((r: any) => [r.stage, r.count])}
            />

            <ReportTable
              title="Motivos de pérdida"
              columns={["Motivo", "Prospectos"]}
              rows={data.lossReasons.map((r: any) => [r.reason, r.count])}
              empty="No hay prospectos perdidos en este periodo"
            />

            <ReportTable
              title="Conversión por vendedor"
              columns={["Vendedor", "Total", "Ganados", "Conversión", "Valor ganado"]}
              rows={data.byVendor.map((r: any) => [r.name, r.total, r.won, formatPercent(r.conversion), formatCurrency(r.value)])}
            />

            <ReportTable
              title="Conversión por asesor externo"
              columns={["Asesor", "Empresa", "Total", "Ganados", "Conversión", "Valor ganado"]}
              rows={data.byAdvisor.map((r: any) => [r.name, r.company, r.total, r.won, formatPercent(r.conversion), formatCurrency(r.value)])}
              empty="No hay prospectos de asesores externos en este periodo"
            />

            <ReportTable
              title="Conversión por empresa inmobiliaria"
              columns={["Empresa", "Total", "Ganados", "Conversión", "Valor ganado"]}
              rows={data.byCompany.map((r: any) => [r.name, r.total, r.won, formatPercent(r.conversion), formatCurrency(r.value)])}
              empty="No hay prospectos vinculados a empresas en este periodo"
            />

            <ReportTable
              title="Conversión por tag"
              columns={["Tag", "Total", "Ganados", "Conversión"]}
              rows={data.byTag.map((r: any) => [`#${r.name}`, r.total, r.won, formatPercent(r.conversion)])}
            />

            <ReportTable
              title="Conversión por canal"
              columns={["Canal", "Total", "Ganados", "Conversión"]}
              rows={data.byChannel.map((r: any) => [r.name, r.total, r.won, formatPercent(r.conversion)])}
            />

            <ReportTable
              title="Inversión y CAC por periodo"
              columns={["Periodo", "Inversión", "Leads", "Ventas", "CAC"]}
              rows={data.byPeriod.map((r: any) => [r.period, formatCurrency(r.amount), r.leads, r.sales, r.cac !== null ? formatCurrency(r.cac) : "Datos insuficientes"])}
            />

            <ReportTable
              title="Productividad por vendedor"
              columns={["Vendedor", "Prospectos asignados", "Ganados", "Actividades registradas"]}
              rows={data.productivity.map((r: any) => [r.name, r.prospectsAssigned, r.won, r.activities])}
            />
          </>
        )}
      </div>
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
