export type RangeKey = "semana" | "mes" | "trimestre" | "semestre" | "año" | "todo" | "personalizado";

export function getRange(key: RangeKey, from?: string, to?: string): { start: Date | null; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (key === "personalizado" && from && to) {
    const s = new Date(from);
    s.setHours(0, 0, 0, 0);
    const e = new Date(to);
    e.setHours(23, 59, 59, 999);
    return { start: s, end: e };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (key) {
    case "semana":
      start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1));
      return { start, end };
    case "mes":
      start.setDate(1);
      return { start, end };
    case "trimestre": {
      const q = Math.floor(start.getMonth() / 3);
      start.setMonth(q * 3, 1);
      return { start, end };
    }
    case "semestre": {
      const h = start.getMonth() < 6 ? 0 : 6;
      start.setMonth(h, 1);
      return { start, end };
    }
    case "año":
      start.setMonth(0, 1);
      return { start, end };
    case "todo":
    default:
      return { start: null, end };
  }
}

export const rangeLabels: Record<RangeKey, string> = {
  semana: "Esta semana",
  mes: "Este mes",
  trimestre: "Este trimestre",
  semestre: "Este semestre",
  año: "Este año",
  todo: "Todo el historial",
  personalizado: "Rango personalizado",
};
