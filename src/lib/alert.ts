import { Stage } from "@prisma/client";

export type AlertStatus = "green" | "yellow" | "red" | "closed";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Semáforo de seguimiento: verde (<72h), amarillo (>=72h), rojo (>=96h).
 * No aplica en etapas Ganado/Perdido. Tampoco aplica si el prospecto ya
 * tiene una próxima acción anotada (con o sin fecha): ya hay un plan, así
 * que no cuenta como abandonado aunque haya pasado tiempo desde la última
 * actividad. Si esa acción tiene fecha y ya se venció, sí vuelve a alertar.
 */
export function getAlertStatus(
  lastActivityAt: Date | string,
  stage: Stage,
  nextActionDate?: Date | string | null,
  nextAction?: string | null
): AlertStatus {
  if (stage === "GANADO" || stage === "PERDIDO") return "closed";
  const nextActionOverdue = !!nextActionDate && new Date(nextActionDate).getTime() < Date.now();
  if (nextAction?.trim() && !nextActionOverdue) return "green";
  const last = new Date(lastActivityAt).getTime();
  const hours = (Date.now() - last) / HOUR_MS;
  if (hours >= 96) return "red";
  if (hours >= 72) return "yellow";
  return "green";
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
