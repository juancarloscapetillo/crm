import { Stage, SourceType, ActivityType, Role } from "@prisma/client";

export const stageLabels: Record<Stage, string> = {
  INFORMES: "📥 Informes",
  VISITA: "📅 Visita",
  NEGOCIACION: "🤝 Negociación",
  GANADO: "✅ Ganado",
  PERDIDO: "❌ Perdido",
};

export const stageOrder: Stage[] = ["INFORMES", "VISITA", "NEGOCIACION", "GANADO", "PERDIDO"];
export const pipelineStages: Stage[] = ["INFORMES", "VISITA", "NEGOCIACION", "GANADO", "PERDIDO"];

export const stageColors: Record<Stage, string> = {
  INFORMES: "#5B8DEF",
  VISITA: "#F6B436",
  NEGOCIACION: "#9B6FD9",
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
