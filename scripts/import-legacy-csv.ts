import { PrismaClient, Stage, SourceType } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

const IMPORT_TAG_NAME = "Importación 2026";
// CSV content is provided at runtime only (never committed to git, since it
// contains real client names/notes): via LEGACY_CSV_PATH pointing at a file,
// or LEGACY_CSV_B64 with the file's base64 content, or piped on stdin.
const ADRIANA_EMAIL = process.env.VENDEDORA_EMAIL || "desarrolladoracalume@gmail.com";
const ADRIANA_NAME = process.env.VENDEDORA_NAME || "Adriana Echeverría";

function loadCsvText(): string {
  if (process.env.LEGACY_CSV_B64) {
    return Buffer.from(process.env.LEGACY_CSV_B64, "base64").toString("utf-8");
  }
  if (process.env.LEGACY_CSV_PATH) {
    return fs.readFileSync(process.env.LEGACY_CSV_PATH, "utf-8");
  }
  return fs.readFileSync(0, "utf-8"); // stdin
}

const STAGE_MAP: Record<string, Stage> = {
  informes: "INFORMES",
  visita: "VISITA",
  "cotización": "NEGOCIACION",
  cotizacion: "NEGOCIACION",
  cerrada: "GANADO",
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

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function norm(s: string): string {
  return stripAccents(s).toLowerCase().trim();
}

// Minimal CSV line parser handling quoted fields with embedded commas.
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
    } else {
      if (c === '"') {
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

async function main() {
  const force = process.argv.includes("--force");

  const existingTag = await prisma.tag.findFirst({ where: { name: IMPORT_TAG_NAME } });
  if (existingTag) {
    const alreadyImported = await prisma.prospectTag.count({ where: { tagId: existingTag.id } });
    if (alreadyImported > 0 && !force) {
      console.log(
        `Ya existen ${alreadyImported} prospectos con el tag "${IMPORT_TAG_NAME}". Abortando para evitar duplicados. Usa --force para forzar de todos modos.`
      );
      process.exit(1);
    }
  }

  const raw = loadCsvText();
  const rows = parseCsv(raw).filter((r) => r.some((c) => c.trim() !== ""));
  const [header, ...data] = rows;
  console.log("Encabezado:", header.join(" | "));
  console.log(`Filas de datos a procesar: ${data.length}`);

  const adriana = await prisma.user.upsert({
    where: { email: ADRIANA_EMAIL },
    update: {},
    create: {
      name: ADRIANA_NAME,
      email: ADRIANA_EMAIL,
      passwordHash: "IMPORT_PLACEHOLDER_NOT_A_VALID_HASH",
      role: "VENDEDOR",
    },
  });
  console.log(`Vendedora vinculada: ${adriana.name} <${adriana.email}> (${adriana.id})`);

  const importTag = await prisma.tag.upsert({
    where: { name: IMPORT_TAG_NAME },
    update: {},
    create: { name: IMPORT_TAG_NAME, color: "#6B7280" },
  });

  const tagCache = new Map<string, string>(); // name -> id
  const projectCache = new Map<string, string>(); // lowercase name -> id
  const companyCache = new Map<string, string>(); // lowercase name -> id
  const advisorCache = new Map<string, string>(); // lowercase "name|companyId" -> id

  async function getOrCreateTag(name: string): Promise<string> {
    const key = norm(name);
    if (tagCache.has(key)) return tagCache.get(key)!;
    const existing = await prisma.tag.findFirst({ where: { name: { equals: name, mode: "insensitive" } } });
    const tag =
      existing ?? (await prisma.tag.create({ data: { name, color: TAG_COLORS[name] ?? "#253574" } }));
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
    const existing = await prisma.company.findFirst({
      where: { commercialName: { equals: name, mode: "insensitive" } },
    });
    const company = existing ?? (await prisma.company.create({ data: { commercialName: name } }));
    companyCache.set(key, company.id);
    return company.id;
  }

  async function getOrCreateAdvisor(name: string, companyId: string | null): Promise<string> {
    const key = `${norm(name)}|${companyId ?? ""}`;
    if (advisorCache.has(key)) return advisorCache.get(key)!;
    const existing = await prisma.advisor.findFirst({
      where: { name: { equals: name, mode: "insensitive" }, companyId: companyId ?? null },
    });
    const advisor = existing ?? (await prisma.advisor.create({ data: { name, companyId } }));
    advisorCache.set(key, advisor.id);
    return advisor.id;
  }

  const projectNameCanonical: Record<string, string> = {
    muretto: "Muretto",
    "santé": "Santé",
    sante: "Santé",
    covalia: "Covalia",
    baura: "Baura",
  };

  let created = 0;
  const errors: string[] = [];

  for (let idx = 0; idx < data.length; idx++) {
    const r = data[idx];
    const rowNum = idx + 2; // 1-indexed + header
    const [
      nombreCliente,
      proyecto,
      etiqueta,
      fechaInicio,
      ultimoSeguimiento,
      tagsCol,
      asignadoA,
      _precioLiteral,
      precioEstimado,
      comentarios,
    ] = r.map((c) => (c ?? "").trim());

    try {
      // --- Broker / company from "Nombre del Cliente" ---
      const dashIdx = nombreCliente.indexOf(" - ");
      const brokerName = dashIdx >= 0 ? nombreCliente.slice(0, dashIdx).trim() : nombreCliente.trim();
      const companyPartRaw = dashIdx >= 0 ? nombreCliente.slice(dashIdx + 3).trim() : "";

      const isDirecto = norm(brokerName).includes(norm("Adriana Echeverria")) || norm(brokerName).includes(norm("Adriana Echeveria"));

      let companyId: string | null = null;
      let advisorId: string | null = null;
      if (!isDirecto) {
        const companyIsGeneric = companyPartRaw === "" || norm(companyPartRaw).startsWith("independiente");
        if (!companyIsGeneric) {
          companyId = await getOrCreateCompany(companyPartRaw);
        }
        if (brokerName) {
          advisorId = await getOrCreateAdvisor(brokerName, companyId);
        }
      }

      // --- Real client name + notes from "Comentarios" (split on first "//") ---
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

      // --- Stage ---
      const stage = STAGE_MAP[norm(etiqueta)];
      if (!stage) {
        errors.push(`Fila ${rowNum}: etapa desconocida "${etiqueta}", se omite la fila.`);
        continue;
      }

      // --- Source type ---
      const tagKey = norm(tagsCol);
      let sourceType: SourceType = tagsCol
        ? TAG_SOURCE_MAP[tagKey] ?? (advisorId ? "ASESOR_EXTERNO" : "DIRECTO")
        : advisorId
        ? "ASESOR_EXTERNO"
        : "DIRECTO";
      if (isDirecto) sourceType = "DIRECTO";

      // --- Assigned user ---
      const assignedUserId = norm(asignadoA).includes("adriana echeverria") ? adriana.id : null;

      // --- Project ---
      const projectKey = norm(proyecto);
      const projectName = projectNameCanonical[projectKey] ?? proyecto;
      const projectId = proyecto ? await getOrCreateProject(projectName) : null;

      // --- Dates ---
      const entryDate = parseDate(fechaInicio) ?? new Date();
      const lastActivityAt = parseDate(ultimoSeguimiento) ?? entryDate;

      // --- Estimated value ---
      const estimatedValueNum = parseFloat(precioEstimado.replace(/[^0-9.]/g, ""));
      const estimatedValue = estimatedValueNum > 0 ? estimatedValueNum : null;

      // --- Notes footer for traceability ---
      const originSummary = `[Importado del CRM anterior. Asesor original: "${nombreCliente || "—"}"]`;
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
              content: "Prospecto importado del histórico de trabajo (CRM anterior).",
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
      errors.push(`Fila ${rowNum}: error — ${(e as Error).message}`);
    }
  }

  console.log(`\nProspectos creados: ${created} / ${data.length}`);
  console.log(`Proyectos usados: ${[...projectCache.keys()].join(", ")}`);
  console.log(`Empresas creadas/usadas: ${companyCache.size}`);
  console.log(`Asesores creados/usados: ${advisorCache.size}`);
  console.log(`Tags creados/usados: ${[...tagCache.keys()].join(", ")}, ${IMPORT_TAG_NAME}`);
  if (errors.length) {
    console.log(`\nErrores/omisiones (${errors.length}):`);
    errors.forEach((e) => console.log(" - " + e));
  }
}

main()
  .catch((e) => {
    console.error("Error fatal en la importación:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
