import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError, canManageAllProspects } from "@/lib/api";
import { getAlertStatus } from "@/lib/alert";
import { stageLabels, stageRank } from "@/lib/labels";
import { Stage } from "@prisma/client";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const prospect = await prisma.prospect.findUnique({
      where: { id: params.id },
      include: {
        assignedUser: true,
        project: true,
        advisor: { include: { company: true } },
        company: true,
        tags: { include: { tag: true } },
        favoritedBy: { where: { userId: user.id } },
        tasks: { orderBy: { dueDate: "asc" }, include: { createdBy: true, assignedUser: true } },
        attachments: { select: { id: true, filename: true, mimeType: true, size: true, createdAt: true, uploadedBy: true } },
        activities: { include: { user: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!prospect) return jsonError("Prospecto no encontrado", 404);
    if (!canManageAllProspects(user.role) && prospect.assignedUserId !== user.id) return jsonError("No autorizado", 403);

    return NextResponse.json({
      prospect: {
        ...prospect,
        alertStatus: getAlertStatus(prospect.lastActivityAt, prospect.stage, prospect.nextActionDate, prospect.nextAction),
        isFavorite: prospect.favoritedBy.length > 0,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const existing = await prisma.prospect.findUnique({ where: { id: params.id }, include: { assignedUser: true } });
    if (!existing) return jsonError("Prospecto no encontrado", 404);
    if (!canManageAllProspects(user.role) && existing.assignedUserId !== user.id) return jsonError("No autorizado", 403);

    const data: any = {};
    const activitiesToCreate: any[] = [];
    const now = new Date();

    const simpleFields = [
      "name", "phone", "email", "companyName", "sourceType", "companyId", "advisorId",
      "projectId", "unitInterest", "paymentMethod", "notes", "nextAction",
    ];
    for (const f of simpleFields) {
      if (body[f] !== undefined) data[f] = body[f] || null;
    }
    if (body.budget !== undefined) data.budget = body.budget === null || body.budget === "" ? null : Number(body.budget);
    if (body.estimatedValue !== undefined) data.estimatedValue = body.estimatedValue === null || body.estimatedValue === "" ? null : Number(body.estimatedValue);
    if (body.nextActionDate !== undefined) data.nextActionDate = body.nextActionDate ? new Date(body.nextActionDate) : null;

    let touchesActivity = Object.keys(data).length > 0;

    if (body.stage && body.stage !== existing.stage) {
      const newStage = body.stage as Stage;
      data.stage = newStage;
      data.stageEnteredAt = now;
      if (stageRank[newStage] > stageRank[existing.maxStage]) data.maxStage = newStage;
      if (newStage === "PERDIDO") data.lossReason = body.lossReason || existing.lossReason || null;
      if (newStage !== "PERDIDO" && existing.stage === "PERDIDO") data.lossReason = null;
      activitiesToCreate.push({
        type: "CAMBIO_ETAPA",
        fromValue: stageLabels[existing.stage],
        toValue: stageLabels[newStage],
        content: `Etapa cambiada de ${stageLabels[existing.stage]} a ${stageLabels[newStage]}`,
        userId: user.id,
      });
      touchesActivity = true;
    } else if (body.lossReason !== undefined) {
      data.lossReason = body.lossReason || null;
    }

    if (body.assignedUserId !== undefined && body.assignedUserId !== existing.assignedUserId) {
      data.assignedUserId = body.assignedUserId || null;
      const newUser = body.assignedUserId ? await prisma.user.findUnique({ where: { id: body.assignedUserId } }) : null;
      activitiesToCreate.push({
        type: "CAMBIO_VENDEDOR",
        fromValue: existing.assignedUser?.name || "Sin asignar",
        toValue: newUser?.name || "Sin asignar",
        content: `Vendedor cambiado de ${existing.assignedUser?.name || "Sin asignar"} a ${newUser?.name || "Sin asignar"}`,
        userId: user.id,
      });
      touchesActivity = true;
    }

    if (Array.isArray(body.tagIds)) {
      await prisma.prospectTag.deleteMany({ where: { prospectId: params.id } });
      if (body.tagIds.length) {
        await prisma.prospectTag.createMany({
          data: body.tagIds.map((tagId: string) => ({ prospectId: params.id, tagId })),
        });
      }
      touchesActivity = true;
    }

    if (touchesActivity) data.lastActivityAt = now;

    const prospect = await prisma.prospect.update({
      where: { id: params.id },
      data: {
        ...data,
        activities: activitiesToCreate.length ? { create: activitiesToCreate } : undefined,
      },
      include: { tags: { include: { tag: true } }, assignedUser: true },
    });

    return NextResponse.json({ prospect });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (user.role !== "ADMIN") return jsonError("Solo un administrador puede eliminar prospectos", 403);
    await prisma.prospect.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
