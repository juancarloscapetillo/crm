import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { Stage } from "@prisma/client";

const CAMPAIGN_TAG_NAME = "Campaña GL";
const CAMPAIGN_TAG_COLOR = "#8B5CF6";

// Kommo's "Estatus del lead" -> Calume Stage, per the funnel mapping the
// user supplied: everything the AI setter handles before a lead is ready
// for a human collapses into SIN_CONTACTAR; "Listo para atender" is the
// hand-off point into INFORMES. "En pausa" has no direct equivalent in
// Calume's funnel — mapped to INFORMES per explicit instruction.
const STAGE_MAP: Record<string, Stage> = {
  "leads nuevos": "SIN_CONTACTAR",
  "primer intento de contacto": "SIN_CONTACTAR",
  "revisar contacto": "SIN_CONTACTAR",
  "información": "SIN_CONTACTAR",
  informacion: "SIN_CONTACTAR",
  "faltan datos": "SIN_CONTACTAR",
  "listo para atender": "INFORMES",
  "en pausa": "INFORMES",
  cita: "VISITA",
  visita: "VISITA",
  "negociación": "NEGOCIACION",
  negociacion: "NEGOCIACION",
  apartados: "APARTADO",
  apartado: "APARTADO",
  ganados: "GANADO",
  ganado: "GANADO",
  perdidos: "PERDIDO",
  perdido: "PERDIDO",
};

function norm(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// Kommo's XLSX export forces text on phone numbers with a leading "'".
function cleanPhone(raw: string): string {
  return raw.replace(/^'/, "").trim();
}

function humanizeSlug(raw: string): string {
  const s = raw.replace(/_/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// DD.MM.YYYY HH:mm:ss (Kommo's export format)
function parseKommoDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!m) return null;
  const [, d, mo, y, h, mi, se] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +(h || 0), +(mi || 0), +(se || 0)));
}

function pickFirst(row: Record<string, any>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

export interface KommoImportSummary {
  totalRows: number;
  created: number;
  skippedDuplicates: { name: string; matchedOn: string }[];
  skippedUnmappedStage: { name: string; stage: string }[];
  unassigned: number;
  projectsUsed: string[];
}

export async function importKommoLeads(fileBuffer: Buffer): Promise<KommoImportSummary> {
  const wb = XLSX.read(fileBuffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

  const campaignTag = await prisma.tag.upsert({
    where: { name: CAMPAIGN_TAG_NAME },
    update: {},
    create: { name: CAMPAIGN_TAG_NAME, color: CAMPAIGN_TAG_COLOR },
  });

  const projectCache = new Map<string, string>();
  async function getOrCreateProject(name: string): Promise<string> {
    const key = norm(name);
    if (projectCache.has(key)) return projectCache.get(key)!;
    const existing = await prisma.project.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    const project = existing ?? (await prisma.project.create({ data: { name } }));
    projectCache.set(key, project.id);
    return project.id;
  }

  const userCache = new Map<string, string | null>();
  async function findUserByName(name: string): Promise<string | null> {
    const key = norm(name);
    if (!key) return null;
    if (userCache.has(key)) return userCache.get(key)!;
    const users = await prisma.user.findMany({ select: { id: true, name: true } });
    const match = users.find((u) => norm(u.name) === key);
    userCache.set(key, match?.id ?? null);
    return match?.id ?? null;
  }

  const summary: KommoImportSummary = {
    totalRows: rows.length,
    created: 0,
    skippedDuplicates: [],
    skippedUnmappedStage: [],
    unassigned: 0,
    projectsUsed: [],
  };

  for (const row of rows) {
    const name = pickFirst(row, "Contacto principal", "Nombre del lead") || "Lead de Kommo";

    const phone = cleanPhone(
      pickFirst(
        row,
        "Teléfono celular (contacto)",
        "Teléfono oficina (contacto)",
        "Teléfono oficina directo (contacto)",
        "Teléfono de casa (contacto)",
        "Otro teléfono (contacto)"
      )
    );
    const email = pickFirst(row, "Correo (contacto)", "E-mail priv. (contacto)", "Otro e-mail (contacto)");

    // Dedupe against prospects Calume may have already auto-created from the
    // same Meta Ads leads (the webhook creates one the moment a form is
    // submitted, independent of this Kommo export).
    if (phone || email) {
      const existing = await prisma.prospect.findFirst({
        where: {
          OR: [phone ? { phone } : undefined, email ? { email: { equals: email, mode: "insensitive" } } : undefined].filter(
            Boolean
          ) as any,
        },
      });
      if (existing) {
        summary.skippedDuplicates.push({ name, matchedOn: phone && existing.phone === phone ? `teléfono ${phone}` : `correo ${email}` });
        continue;
      }
    }

    const kommoStatus = String(row["Estatus del lead"] || "").trim();
    const stage = STAGE_MAP[norm(kommoStatus)];
    if (!stage) {
      summary.skippedUnmappedStage.push({ name, stage: kommoStatus || "(vacío)" });
      continue;
    }

    const embudo = String(row["Embudo de ventas"] || "").trim();
    const projectId = embudo ? await getOrCreateProject(embudo) : null;
    if (embudo && !summary.projectsUsed.includes(embudo)) summary.projectsUsed.push(embudo);

    const responsable = String(row["Responsable"] || "").trim();
    const assignedUserId = responsable ? await findUserByName(responsable) : null;
    if (!assignedUserId) summary.unassigned++;

    const entryDate = parseKommoDate(String(row["Fecha de creación"] || "")) ?? new Date();
    const lastActivityAt = parseKommoDate(String(row["Última modificación el"] || "")) ?? entryDate;

    const interes = String(row["Interés en depto Muretto"] || "").trim();
    const presupuesto = String(row["Presupuesto estimado propiedad"] || "").trim();
    const timing = String(row["Cuándo planea adquirir"] || "").trim();
    const experiencia = String(row["Ha comprado antes en Mérida"] || "").trim();
    const notasKommo = [1, 2, 3, 4, 5]
      .map((n) => String(row[`Nota ${n}`] || "").trim())
      .filter(Boolean);

    const qualifyingLines = [
      "Lead importado del histórico de Kommo.",
      interes ? `Interés: ${humanizeSlug(interes)}` : null,
      presupuesto ? `Presupuesto estimado: ${humanizeSlug(presupuesto)}` : null,
      timing ? `Cuándo planea comprar: ${humanizeSlug(timing)}` : null,
      experiencia ? `Experiencia previa en Mérida: ${humanizeSlug(experiencia)}` : null,
      notasKommo.length ? `Notas de Kommo:\n${notasKommo.map((n) => `- ${n}`).join("\n")}` : null,
    ].filter(Boolean);
    const qualifyingNote = qualifyingLines.join("\n");

    const estimatedValueNum = parseFloat(presupuesto.replace(/[^0-9.]/g, ""));
    const estimatedValue = /^[0-9.,\s]+$/.test(presupuesto) && estimatedValueNum > 0 ? estimatedValueNum : null;
    const unitInterest = /recamara|recámara/i.test(interes) ? interes.replace(/_/g, " ").trim() : null;

    const prospect = await prisma.prospect.create({
      data: {
        name,
        phone: phone || null,
        email: email || null,
        sourceType: "CAMPANA",
        stage,
        stageEnteredAt: entryDate,
        maxStage: stage === "PERDIDO" ? "INFORMES" : stage,
        projectId,
        assignedUserId,
        unitInterest,
        estimatedValue,
        entryDate,
        lastActivityAt,
        notes: null,
        activities: {
          create: [
            { type: "CREACION", content: "Prospecto importado desde Kommo (Campaña GL)", userId: assignedUserId, createdAt: entryDate },
            { type: "COMENTARIO", content: qualifyingNote, userId: assignedUserId, createdAt: entryDate },
          ],
        },
        tags: { create: [{ tagId: campaignTag.id }] },
      },
    });

    void prospect;
    summary.created++;
  }

  return summary;
}
