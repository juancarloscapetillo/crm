import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError } from "@/lib/api";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return jsonError("Selecciona un archivo");
    if (file.size > MAX_SIZE) return jsonError("El archivo supera el límite de 8MB");

    const buffer = Buffer.from(await file.arrayBuffer());
    const attachment = await prisma.attachment.create({
      data: {
        prospectId: params.id,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        data: buffer,
        uploadedBy: user.name,
      },
      select: { id: true, filename: true, mimeType: true, size: true, createdAt: true, uploadedBy: true },
    });

    await prisma.activity.create({
      data: { prospectId: params.id, userId: user.id, type: "ACTUALIZACION", content: `Documento adjuntado: ${file.name}` },
    });
    await prisma.prospect.update({ where: { id: params.id }, data: { lastActivityAt: new Date() } });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
