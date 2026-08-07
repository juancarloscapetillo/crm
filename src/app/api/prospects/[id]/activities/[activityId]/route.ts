import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError, canManageAllProspects } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; activityId: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const prospect = await prisma.prospect.findUnique({ where: { id: params.id } });
    if (!prospect) return jsonError("Prospecto no encontrado", 404);
    if (!canManageAllProspects(user.role) && prospect.assignedUserId !== user.id) return jsonError("No autorizado", 403);

    if (body.pinned !== undefined) {
      if (body.pinned) {
        await prisma.activity.updateMany({
          where: { prospectId: params.id, pinned: true },
          data: { pinned: false },
        });
      }
      await prisma.activity.update({ where: { id: params.activityId }, data: { pinned: body.pinned } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
