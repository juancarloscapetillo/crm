import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser, handleApiError, jsonError } from "@/lib/api";
import { decodeCsvBuffer, importLegacyProspects } from "@/lib/legacyImport";

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) return jsonError("Sube un archivo CSV");
    const force = form.get("force") === "true";

    const buf = Buffer.from(await file.arrayBuffer());
    const csvText = decodeCsvBuffer(buf);

    const summary = await importLegacyProspects(csvText, { force });

    if (summary.alreadyImported) {
      return jsonError(
        `Ya existen ${summary.alreadyImported} prospectos importados previamente. Marca "Forzar" si de verdad quieres importar de nuevo (puede duplicar registros).`,
        409
      );
    }

    return NextResponse.json({ summary });
  } catch (err) {
    return handleApiError(err);
  }
}
