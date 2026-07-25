import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError } from "@/lib/api";

const VALID_TYPES = ["COMENTARIO", "LLAMADA", "MENSAJE", "CORREO", "VISITA"];

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const type = VALID_TYPES.includes(body.type) ? body.type : "COMENTARIO";
    if (!body.content?.trim()) return jsonError("Escribe una nota para esta actividad");

    const prospect = await prisma.prospect.findUnique({ where: { id: params.id } });
    if (!prospect) return jsonError("Prospecto no encontrado", 404);
    if (user.role === "VENDEDOR" && prospect.assignedUserId !== user.id) return jsonError("No autorizado", 403);

    const activity = await prisma.activity.create({
      data: { prospectId: params.id, userId: user.id, type, content: body.content.trim() },
      include: { user: true },
    });

    await prisma.prospect.update({ where: { id: params.id }, data: { lastActivityAt: new Date() } });

    return NextResponse.json({ activity }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
