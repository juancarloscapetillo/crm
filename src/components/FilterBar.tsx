"use client";

import { rangeLabels, RangeKey } from "@/lib/dateRanges";

export type Filters = {
  range: RangeKey;
  from?: string;
  to?: string;
  vendedor?: string;
  tag?: string;
  source?: string;
  project?: string;
  includeDemo?: string;
};

const sourceOptions = [
  { value: "DIRECTO", label: "Venta directa" },
  { value: "ASESOR_EXTERNO", label: "Asesor externo" },
  { value: "COMUNIDAD", label: "Comunidad / Alianza" },
  { value: "REFERIDO", label: "Referido" },
  { value: "CAMPANA", label: "Campaña de marketing" },
];

export default function FilterBar({
  filters,
  onChange,
  users,
  tags,
  projects,
  showSource = true,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  users: any[];
  tags: any[];
  projects: any[];
  showSource?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-xl2 p-3">
      <div>
        <label className="label">Periodo</label>
        <select
          className="input"
          value={filters.range}
          onChange={(e) => onChange({ ...filters, range: e.target.value as RangeKey })}
        >
          {Object.entries(rangeLabels).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      {filters.range === "personalizado" && (
        <>
          <div>
            <label className="label">Desde</label>
            <input type="date" className="input" value={filters.from || ""} onChange={(e) => onChange({ ...filters, from: e.target.value })} />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input type="date" className="input" value={filters.to || ""} onChange={(e) => onChange({ ...filters, to: e.target.value })} />
          </div>
        </>
      )}
      <div>
        <label className="label">Vendedor</label>
        <select className="input" value={filters.vendedor || ""} onChange={(e) => onChange({ ...filters, vendedor: e.target.value || undefined })}>
          <option value="">Todos</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Tag</label>
        <select className="input" value={filters.tag || ""} onChange={(e) => onChange({ ...filters, tag: e.target.value || undefined })}>
          <option value="">Todos</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              #{t.name}
            </option>
          ))}
        </select>
      </div>
      {showSource && (
        <div>
          <label className="label">Fuente / canal</label>
          <select className="input" value={filters.source || ""} onChange={(e) => onChange({ ...filters, source: e.target.value || undefined })}>
            <option value="">Todas</option>
            {sourceOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="label">Proyecto</label>
        <select className="input" value={filters.project || ""} onChange={(e) => onChange({ ...filters, project: e.target.value || undefined })}>
          <option value="">Todos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-600 pb-2">
        <input
          type="checkbox"
          checked={filters.includeDemo === "true"}
          onChange={(e) => onChange({ ...filters, includeDemo: e.target.checked ? "true" : undefined })}
        />
        Incluir datos demostrativos
      </label>
      {(filters.vendedor || filters.tag || filters.source || filters.project || filters.range !== "todo") && (
        <button
          className="btn-secondary text-xs"
          onClick={() => onChange({ range: "todo" })}
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
