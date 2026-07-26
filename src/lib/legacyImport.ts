import { prisma } from "@/lib/prisma";
import { Prisma, SourceType, Stage } from "@prisma/client";

const IMPORT_TAG_NAME = "Importación 2026";

const STAGE_MAP: Record<string, Stage> = {
  "sin contactar": "SIN_CONTACTAR",
  informes: "INFORMES",
  visita: "VISITA",
  "cotización": "NEGOCIACION",
  cotizacion: "NEGOCIACION",
  negociacion: "NEGOCIACION",
  "negociación": "NEGOCIACION",
  cerrada: "GANADO",
  ganado: "GANADO",
  perdida: "PERDIDO",
  perdido: "PERDIDO",
};

const TAG_SOURCE_MAP: Record<string, SourceType> = {
  broker: "ASESOR_EXTERNO",
  "redes sociales": "CAMPANA",
  "boca a boca": "REFERIDO",
};

const TAG_COLORS: Record<string, string> = {
  Broker: "#0EA5E9",
  "Redes Sociales": "#D946EF",
  "Boca a boca": "#F59E0B",
};

// CP850 (DOS Latin-1) high-range byte -> Unicode code point, for legacy
// Excel/Numbers CSV exports that aren't valid UTF-8.
const CP850_HIGH: number[] = [
  0xc7, 0xfc, 0xe9, 0xe2, 0xe4, 0xe0, 0xe5, 0xe7, 0xea, 0xeb, 0xe8, 0xef, 0xee, 0xec, 0xc4, 0xc5,
  0xc9, 0xe6, 0xc6, 0xf4, 0xf6, 0xf2, 0xfb, 0xf9, 0xff, 0xd6, 0xdc, 0xf8, 0xa3, 0xd8, 0xd7, 0x192,
  0xe1, 0xed, 0xf3, 0xfa, 0xf1, 0xd1, 0xaa, 0xba, 0xbf, 0xae, 0xac, 0xbd, 0xbc, 0xa1, 0xab, 0xbb,
  0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0xc1, 0xc2, 0xc0, 0xa9, 0x2563, 0x2551, 0x2557, 0x255d, 0xa2, 0xa5, 0x2510,
  0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c, 0xe3, 0xc3, 0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0xa4,
  0xf0, 0xd0, 0xca, 0xcb, 0xc8, 0x131, 0xcd, 0xce, 0xcf, 0x2518, 0x250c, 0x2588, 0x2584, 0xa6, 0xcc, 0x2580,
  0xd3, 0xdf, 0xd4, 0xd2, 0xf5, 0xd5, 0xb5, 0xfe, 0xde, 0xda, 0xdb, 0xd9, 0xfd, 0xdd, 0xaf, 0xb4,
  0xad, 0xb1, 0x2017, 0xbe, 0xb6, 0xa7, 0xf7, 0xb8, 0xb0, 0xa8, 0xb7, 0xb9, 0xb3, 0xb2, 0x25a0, 0xa0,
];

function decodeCp850(buf: Buffer): string {
  let out = "";
  for (const byte of buf) {
    out += byte < 0x80 ? String.fromCharCode(byte) : String.fromCodePoint(CP850_HIGH[byte - 0x80]);
  }
  return out;
}

export function decodeCsvBuffer(buf: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return decodeCp850(buf);
  }
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function norm(s: string): string {
  return stripAccents(s).toLowerCase().trim();
}

// Loose comparison key: collapses doubled letters so minor typos like
// "Echevería" vs "Echeverría" still compare equal.
function looseKey(s: string): string {
  return norm(s).replace(/(.)\1+/g, "$1");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // skip
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function parseDate(ddmmyyyy: string): Date | null {
  const s = ddmmyyyy.trim();
  if (!s) return null;
  const [d, m, y] = s.split("/").map((n) => parseInt(n, 10));
  if (!d || !m || !y) return null;
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

const PROJECT_NAME_CANONICAL: Record<string, string> = {
  muretto: "Muretto",
  "santé": "Santé",
  sante: "Santé",
  covalia: "Covalia",
  baura: "Baura",
};

export interface ImportSummary {
  totalRows: number;
  created: number;
  skipped: string[];
  projectsUsed: string[];
  companiesTouched: number;
  advisorsTouched: number;
  alreadyImported?: number;
}

export async function importLegacyProspects(csvText: string, opts: { force?: boolean } = {}): Promise<ImportSummary> {
  const importTag = await prisma.tag.upsert({
    where: { name: IMPORT_TAG_NAME },
    update: {},
    create: { name: IMPORT_TAG_NAME, color: "#6B7280" },
  });

  const alreadyImported = await prisma.prospectTag.count({ where: { tagId: importTag.id } });
  if (alreadyImported > 0 && !opts.force) {
    return {
      totalRows: 0,
      created: 0,
      skipped: [],
      projectsUsed: [],
      companiesTouched: 0,
      advisorsTouched: 0,
      alreadyImported,
    };
  }

  const rows = parseCsv(csvText).filter((r) => r.some((c) => c.trim() !== ""));
  const [, ...data] = rows;

  const tagCache = new Map<string, string>();
  const projectCache = new Map<string, string>();
  const companyCache = new Map<string, string>();
  const advisorCache = new Map<string, string>();
  const userCache = new Map<string, string | null>();

  async function getOrCreateTag(name: string): Promise<string> {
    const key = norm(name);
    if (tagCache.has(key)) return tagCache.get(key)!;
    const existing = await prisma.tag.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    const tag = existing ?? (await prisma.tag.create({ data: { name, color: TAG_COLORS[name] ?? "#253574" } }));
    tagCache.set(key, tag.id);
    return tag.id;
  }

  async function getOrCreateProject(name: string): Promise<string> {
    const key = norm(name);
    if (projectCache.has(key)) return projectCache.get(key)!;
    const existing = await prisma.project.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    const project = existing ?? (await prisma.project.create({ data: { name } }));
    projectCache.set(key, project.id);
    return project.id;
  }

  async function getOrCreateCompany(name: string): Promise<string> {
    const key = norm(name);
    if (companyCache.has(key)) return companyCache.get(key)!;
    const existing = await prisma.company.findFirst({ where: { commercialName: { equals: name, mode: "insensitive" } } });
    const company = existing ?? (await prisma.company.create({ data: { commercialName: name } }));
    companyCache.set(key, company.id);
    return company.id;
  }

  async function getOrCreateAdvisor(name: string, companyId: string | null): Promise<string> {
    const key = `${norm(name)}|${companyId ?? ""}`;
    if (advisorCache.has(key)) return advisorCache.get(key)!;
    const existing = await prisma.advisor.findFirst({ where: { name: { equals: name, mode: "insensitive" }, companyId: companyId ?? null } });
    const advisor = existing ?? (await prisma.advisor.create({ data: { name, companyId } }));
    advisorCache.set(key, advisor.id);
    return advisor.id;
  }

  let allUsers: { id: string; name: string }[] | null = null;
  async function findUserByName(name: string): Promise<string | null> {
    const key = norm(name);
    if (!key) return null;
    if (userCache.has(key)) return userCache.get(key)!;
    if (!allUsers) allUsers = await prisma.user.findMany({ select: { id: true, name: true } });
    const match = allUsers.find((u) => norm(u.name) === key);
    userCache.set(key, match?.id ?? null);
    return match?.id ?? null;
  }

  let created = 0;
  const skipped: string[] = [];

  for (let idx = 0; idx < data.length; idx++) {
    const r = data[idx];
    const rowNum = idx + 2;
    const [
      nombreCliente,
      proyecto,
      etiqueta,
      fechaInicio,
      ultimoSeguimiento,
      tagsCol,
      asignadoA,
      ,
      precioEstimado,
      comentarios,
    ] = r.map((c) => (c ?? "").trim());

    try {
      const dashIdx = nombreCliente.indexOf(" - ");
      const brokerName = dashIdx >= 0 ? nombreCliente.slice(0, dashIdx).trim() : nombreCliente.trim();
      const companyPartRaw = dashIdx >= 0 ? nombreCliente.slice(dashIdx + 3).trim() : "";

      const assignedUserId = asignadoA ? await findUserByName(asignadoA) : null;
      const assignedUserName = assignedUserId
        ? (await prisma.user.findUnique({ where: { id: assignedUserId } }))?.name ?? ""
        : "";
      const isDirecto = assignedUserId !== null && brokerName !== "" && looseKey(brokerName) === looseKey(assignedUserName);

      let companyId: string | null = null;
      let advisorId: string | null = null;
      if (!isDirecto && brokerName) {
        const companyIsGeneric = companyPartRaw === "" || norm(companyPartRaw).startsWith("independiente");
        if (!companyIsGeneric) companyId = await getOrCreateCompany(companyPartRaw);
        advisorId = await getOrCreateAdvisor(brokerName, companyId);
      }

      let clientName: string;
      let noteText: string;
      const sepIdx = comentarios.indexOf("//");
      if (comentarios === "") {
        clientName = `Cliente sin nombre (${brokerName || "sin asesor"})`;
        noteText = "Registro importado sin nombre de cliente ni comentarios en el archivo original.";
      } else if (sepIdx >= 0) {
        clientName = comentarios.slice(0, sepIdx).trim() || `Cliente sin nombre (${brokerName || "sin asesor"})`;
        noteText = comentarios.slice(sepIdx + 2).trim();
      } else {
        clientName = comentarios;
        noteText = "";
      }

      const stage = STAGE_MAP[norm(etiqueta)];
      if (!stage) {
        skipped.push(`Fila ${rowNum}: etapa desconocida "${etiqueta}"`);
        continue;
      }

      const tagKey = norm(tagsCol);
      let sourceType: SourceType = tagsCol
        ? TAG_SOURCE_MAP[tagKey] ?? (advisorId ? "ASESOR_EXTERNO" : "DIRECTO")
        : advisorId
        ? "ASESOR_EXTERNO"
        : "DIRECTO";
      if (isDirecto) sourceType = "DIRECTO";

      const projectKey = norm(proyecto);
      const projectName = PROJECT_NAME_CANONICAL[projectKey] ?? proyecto;
      const projectId = proyecto ? await getOrCreateProject(projectName) : null;

      const entryDate = parseDate(fechaInicio) ?? new Date();
      const lastActivityAt = parseDate(ultimoSeguimiento) ?? entryDate;

      const estimatedValueNum = parseFloat(precioEstimado.replace(/[^0-9.]/g, ""));
      const estimatedValue = estimatedValueNum > 0 ? estimatedValueNum : null;

      const originSummary = `[Importado del histórico de trabajo. Referencia original: "${nombreCliente || "—"}"]`;
      const notes = [noteText, originSummary].filter(Boolean).join("\n\n");

      const prospect = await prisma.prospect.create({
        data: {
          name: clientName,
          sourceType,
          companyId,
          advisorId,
          assignedUserId,
          projectId,
          entryDate,
          stage,
          stageEnteredAt: entryDate,
          estimatedValue,
          notes,
          lastActivityAt,
          activities: {
            create: {
              type: "CREACION",
              content: "Prospecto importado del histórico de trabajo.",
              userId: assignedUserId,
              createdAt: entryDate,
            },
          },
        },
      });

      await prisma.prospectTag.create({ data: { prospectId: prospect.id, tagId: importTag.id } });
      if (tagsCol) {
        const rowTagId = await getOrCreateTag(tagsCol);
        await prisma.prospectTag.create({ data: { prospectId: prospect.id, tagId: rowTagId } });
      }

      created++;
    } catch (e) {
      skipped.push(`Fila ${rowNum}: error — ${e instanceof Prisma.PrismaClientKnownRequestError ? e.message : (e as Error).message}`);
    }
  }

  return {
    totalRows: data.length,
    created,
    skipped,
    projectsUsed: [...projectCache.keys()],
    companiesTouched: companyCache.size,
    advisorsTouched: advisorCache.size,
  };
}
