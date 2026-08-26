import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError } from "@/lib/api";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json();
    if (!body.content?.trim()) return jsonError("Escribe una nota");

    const company = await prisma.company.findUnique({ where: { id: params.id } });
    if (!company) return jsonError("Empresa no encontrada", 404);

    const note = await prisma.note.create({
      data: { companyId: params.id, userId: user.id, content: body.content.trim() },
      include: { user: true },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
