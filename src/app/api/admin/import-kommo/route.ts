import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser, handleApiError, jsonError } from "@/lib/api";
import { importKommoLeads } from "@/lib/kommoImport";

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) return jsonError("Sube el archivo Excel exportado de Kommo");

    const buf = Buffer.from(await file.arrayBuffer());
    const summary = await importKommoLeads(buf);

    return NextResponse.json({ summary });
  } catch (err) {
    return handleApiError(err);
  }
}
