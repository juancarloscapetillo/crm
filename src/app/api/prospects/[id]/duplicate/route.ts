import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError, canManageAllProspects } from "@/lib/api";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const original = await prisma.prospect.findUnique({
      where: { id: params.id },
      include: { tags: true },
    });
    if (!original) return jsonError("Prospecto no encontrado", 404);
    if (!canManageAllProspects(user.role) && original.assignedUserId !== user.id) return jsonError("No autorizado", 403);

    const now = new Date();
    const duplicate = await prisma.prospect.create({
      data: {
        name: `${original.name} (copia)`,
        phone: original.phone,
        email: original.email,
        companyName: original.companyName,
        sourceType: original.sourceType,
        companyId: original.companyId,
        advisorId: original.advisorId,
        assignedUserId: original.assignedUserId,
        projectId: original.projectId,
        unitInterest: original.unitInterest,
        budget: original.budget,
        paymentMethod: original.paymentMethod,
        estimatedValue: original.estimatedValue,
        notes: original.notes,
        stage: "SIN_CONTACTAR",
        stageEnteredAt: now,
        maxStage: "SIN_CONTACTAR",
        lastActivityAt: now,
        entryDate: now,
        tags: original.tags.length ? { create: original.tags.map((t) => ({ tagId: t.tagId })) } : undefined,
        activities: {
          create: {
            type: "CREACION",
            content: `Prospecto duplicado de "${original.name}"`,
            userId: user.id,
          },
        },
      },
      include: { tags: { include: { tag: true } }, assignedUser: true },
    });

    return NextResponse.json({ prospect: duplicate }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
