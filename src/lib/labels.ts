import { Stage, SourceType, ActivityType, Role } from "@prisma/client";

export const stageLabels: Record<Stage, string> = {
  SIN_CONTACTAR: "🆕 Sin contactar",
  INFORMES: "📥 Informes",
  VISITA: "📅 Visita",
  NEGOCIACION: "🤝 Negociación",
  APARTADO: "🔒 Apartado",
  GANADO: "✅ Ganado",
  PERDIDO: "❌ Perdido",
};

export const stageOrder: Stage[] = ["SIN_CONTACTAR", "INFORMES", "VISITA", "NEGOCIACION", "APARTADO", "GANADO", "PERDIDO"];
export const pipelineStages: Stage[] = ["SIN_CONTACTAR", "INFORMES", "VISITA", "NEGOCIACION", "APARTADO", "GANADO", "PERDIDO"];

export const lossReasonOptions = [
  "Fuera de presupuesto",
  "Compró otro proyecto",
  "El proyecto no fue de su agrado",
  "Postergó su búsqueda, no le urge",
  "No busca comprar en Mérida",
  "Otro",
];

// Ranks the real progress a prospect made through the funnel. PERDIDO isn't a
// stage of progress (it's an outcome), so it has no rank and never counts as
// a prospect's max stage reached.
export const stageRank: Record<Stage, number> = {
  SIN_CONTACTAR: 0,
  INFORMES: 1,
  VISITA: 2,
  NEGOCIACION: 3,
  APARTADO: 4,
  GANADO: 5,
  PERDIDO: -1,
};

export const funnelStages: Stage[] = ["INFORMES", "VISITA", "NEGOCIACION", "APARTADO", "GANADO"];

export const stageColors: Record<Stage, string> = {
  SIN_CONTACTAR: "#9CA3AF",
  INFORMES: "#5B8DEF",
  VISITA: "#F6B436",
  NEGOCIACION: "#9B6FD9",
  APARTADO: "#22B8B0",
  GANADO: "#3FBE7A",
  PERDIDO: "#E15B5B",
};

export const sourceLabels: Record<SourceType, string> = {
  DIRECTO: "Venta directa",
  ASESOR_EXTERNO: "Asesor externo",
  COMUNIDAD: "Comunidad / Alianza",
  REFERIDO: "Referido",
  CAMPANA: "Campaña de marketing",
};

export const activityLabels: Record<ActivityType, string> = {
  CREACION: "Prospecto creado",
  COMENTARIO: "Comentario",
  LLAMADA: "Llamada",
  MENSAJE: "Mensaje",
  CORREO: "Correo",
  VISITA: "Visita",
  CAMBIO_ETAPA: "Cambio de etapa",
  CAMBIO_VENDEDOR: "Cambio de vendedor",
  TAREA_CREADA: "Tarea creada",
  TAREA_COMPLETADA: "Tarea completada",
  ACTUALIZACION: "Actualización",
};

export const activityIcons: Record<ActivityType, string> = {
  CREACION: "✨",
  COMENTARIO: "💬",
  LLAMADA: "📞",
  MENSAJE: "📩",
  CORREO: "✉️",
  VISITA: "🏠",
  CAMBIO_ETAPA: "🔄",
  CAMBIO_VENDEDOR: "👤",
  TAREA_CREADA: "🗒️",
  TAREA_COMPLETADA: "✔️",
  ACTUALIZACION: "📝",
};

export const roleLabels: Record<Role, string> = {
  ADMIN: "Administrador",
  VENDEDOR: "Vendedor",
  LEAD_MANAGER: "Lead Manager",
  COORDINADOR: "Coordinador",
};

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(value);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}
