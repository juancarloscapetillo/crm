import fs from "fs";
import { decodeCsvBuffer, importLegacyProspects } from "../src/lib/legacyImport";
import { prisma } from "../src/lib/prisma";

function loadCsvBuffer(): Buffer {
  if (process.env.LEGACY_CSV_B64) return Buffer.from(process.env.LEGACY_CSV_B64, "base64");
  if (process.env.LEGACY_CSV_PATH) return fs.readFileSync(process.env.LEGACY_CSV_PATH);
  return fs.readFileSync(0); // stdin
}

async function main() {
  const force = process.argv.includes("--force");
  const csvText = decodeCsvBuffer(loadCsvBuffer());
  const summary = await importLegacyProspects(csvText, { force });

  if (summary.alreadyImported) {
    console.log(
      `Ya existen ${summary.alreadyImported} prospectos con el tag de importación. Abortando para evitar duplicados. Usa --force para forzar de todos modos.`
    );
    process.exit(1);
  }

  console.log(`Filas de datos procesadas: ${summary.totalRows}`);
  console.log(`Prospectos creados: ${summary.created} / ${summary.totalRows}`);
  console.log(`Proyectos usados: ${summary.projectsUsed.join(", ")}`);
  console.log(`Empresas creadas/usadas: ${summary.companiesTouched}`);
  console.log(`Asesores creados/usados: ${summary.advisorsTouched}`);
  if (summary.skipped.length) {
    console.log(`\nFilas omitidas/con error (${summary.skipped.length}):`);
    summary.skipped.forEach((s) => console.log(" - " + s));
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
