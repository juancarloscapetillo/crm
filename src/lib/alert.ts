import { Stage } from "@prisma/client";

export type AlertStatus = "green" | "yellow" | "red" | "closed";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Semáforo de seguimiento: verde (<72h), amarillo (>=72h), rojo (>=96h).
 * No aplica en etapas Ganado/Perdido.
 */
export function getAlertStatus(lastActivityAt: Date | string, stage: Stage): AlertStatus {
  if (stage === "GANADO" || stage === "PERDIDO") return "closed";
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
