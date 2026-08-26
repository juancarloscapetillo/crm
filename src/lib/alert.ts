import { Stage } from "@prisma/client";

export type AlertStatus = "green" | "yellow" | "red" | "closed";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Semáforo de seguimiento: verde (<72h), amarillo (>=72h), rojo (>=96h).
 * No aplica en etapas Ganado/Perdido. Tampoco aplica si el prospecto ya
 * tiene un seguimiento programado (ver hasOpenFollowUp): ya hay un plan,
 * así que no cuenta como abandonado aunque haya pasado tiempo desde la
 * última actividad.
 */
export function getAlertStatus(
  lastActivityAt: Date | string,
  stage: Stage,
  hasOpenFollowUp = false
): AlertStatus {
  if (stage === "GANADO" || stage === "PERDIDO") return "closed";
  if (hasOpenFollowUp) return "green";
  const last = new Date(lastActivityAt).getTime();
  const hours = (Date.now() - last) / HOUR_MS;
  if (hours >= 96) return "red";
  if (hours >= 72) return "yellow";
  return "green";
}

/**
 * True si el prospecto ya tiene un seguimiento programado que no ha
 * vencido: la "Próxima acción" anotada (con o sin fecha, mientras esa
 * fecha no esté vencida), o al menos una tarea pendiente sin fecha o con
 * fecha futura. Si lo único que hay ya venció, no cuenta — sí debe alertar.
 */
export function hasOpenFollowUp(
  nextAction: string | null | undefined,
  nextActionDate: Date | string | null | undefined,
  pendingTaskDueDates: (Date | string | null)[] = []
): boolean {
  const nextActionOverdue = !!nextActionDate && new Date(nextActionDate).getTime() < Date.now();
  if (nextAction?.trim() && !nextActionOverdue) return true;
  return pendingTaskDueDates.some((d) => !d || new Date(d).getTime() >= Date.now());
}

export function alertLabel(status: AlertStatus): string {
  switch (status) {
    case "green":
      return "Al día";
    case "yellow":
      return "Atención (72h+)";
    case "red":
      return "Urgente (96h+)";
    case "closed":
      return "Cerrado";
  }
}

export const alertColors: Record<AlertStatus, string> = {
  green: "#3FBE7A",
  yellow: "#F0B429",
  red: "#E15B5B",
  closed: "#9CA3AF",
};

export function hoursSince(date: Date | string): number {
  return (Date.now() - new Date(date).getTime()) / HOUR_MS;
}

export const DAYS_WITHOUT_ACTIVE_WARNING = 30;

/**
 * Días desde que un asesor/inmobiliaria dejó de tener al menos un
 * prospecto activo (ni Ganado ni Perdido). null si actualmente sí tiene
 * uno (la columna no aplica). Se cuenta desde la actividad más reciente
 * de cualquiera de sus prospectos; si nunca tuvo ninguno, desde su alta.
 */
export function daysSinceLastActive(
  activeProspectCount: number,
  prospects: { lastActivityAt: Date | string }[],
  fallbackSince: Date | string
): number | null {
  if (activeProspectCount > 0) return null;
  const reference = prospects.length
    ? Math.max(...prospects.map((p) => new Date(p.lastActivityAt).getTime()))
    : new Date(fallbackSince).getTime();
  return Math.floor((Date.now() - reference) / (HOUR_MS * 24));
}
