import { Fragment } from "react";
import { Check } from "lucide-react";
import { roleLabels } from "@/lib/labels";

const roles = ["ADMIN", "VENDEDOR", "COORDINADOR", "LEAD_MANAGER"] as const;

type Row = { action: string; hint?: string; allowed: Record<(typeof roles)[number], boolean> };
type Group = { title: string; rows: Row[] };

const groups: Group[] = [
  {
    title: "Prospectos",
    rows: [
      {
        action: "Ver y editar sus prospectos asignados",
        allowed: { ADMIN: true, VENDEDOR: true, COORDINADOR: true, LEAD_MANAGER: true },
      },
      {
        action: "Ver, editar y reasignar los prospectos de todo el equipo",
        allowed: { ADMIN: true, VENDEDOR: false, COORDINADOR: true, LEAD_MANAGER: false },
      },
      {
        action: "Eliminar prospectos",
        allowed: { ADMIN: true, VENDEDOR: false, COORDINADOR: false, LEAD_MANAGER: false },
      },
      {
        action: "Recibir leads de Meta Ads en automático",
        hint: "Reparto round-robin",
        allowed: { ADMIN: false, VENDEDOR: true, COORDINADOR: false, LEAD_MANAGER: true },
      },
    ],
  },
  {
    title: "Catálogos (asesores, inmobiliarias, proyectos, tags)",
    rows: [
      {
        action: "Crear registros",
        allowed: { ADMIN: true, VENDEDOR: true, COORDINADOR: true, LEAD_MANAGER: true },
      },
      {
        action: "Eliminar registros",
        allowed: { ADMIN: true, VENDEDOR: false, COORDINADOR: false, LEAD_MANAGER: false },
      },
    ],
  },
  {
    title: "Configuración",
    rows: [
      {
        action: "Gestionar usuarios",
        hint: "Crear, editar rol, desactivar, eliminar",
        allowed: { ADMIN: true, VENDEDOR: false, COORDINADOR: false, LEAD_MANAGER: false },
      },
      {
        action: "Configurar fuentes de Meta Ads",
        allowed: { ADMIN: true, VENDEDOR: false, COORDINADOR: false, LEAD_MANAGER: false },
      },
      {
        action: "Importar prospectos históricos",
        allowed: { ADMIN: true, VENDEDOR: false, COORDINADOR: false, LEAD_MANAGER: false },
      },
    ],
  },
  {
    title: "Reportes",
    rows: [
      {
        action: "Ver Dashboard y Reportes de todo el equipo",
        hint: "Sin esto, solo ven lo propio",
        allowed: { ADMIN: true, VENDEDOR: false, COORDINADOR: true, LEAD_MANAGER: false },
      },
    ],
  },
];

export default function PermisosSection() {
  return (
    <div className="card p-4 max-w-4xl">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Matriz de permisos</h3>
        <p className="text-xs text-gray-500 mt-0.5">Qué puede hacer cada rol dentro del CRM</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2">Acción</th>
              {roles.map((r) => (
                <th key={r} className="text-center px-3 py-2 font-semibold normal-case text-gray-700">
                  {roleLabels[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {groups.map((group) => (
              <Fragment key={group.title}>
                <tr className="bg-calume-gold/10">
                  <td colSpan={roles.length + 1} className="px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-calume-navy">
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.action} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5">
                      <span className="text-gray-800">{row.action}</span>
                      {row.hint && <span className="block text-[11px] text-gray-400">{row.hint}</span>}
                    </td>
                    {roles.map((r) => (
                      <td key={r} className="px-3 py-2.5 text-center">
                        {row.allowed[r] ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-alert-green/15 text-alert-green">
                            <Check size={13} strokeWidth={3} />
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-gray-400 mt-3">
        Esta tabla es informativa: refleja los permisos ya implementados en el sistema, no se edita desde aquí.
      </p>
    </div>
  );
}
