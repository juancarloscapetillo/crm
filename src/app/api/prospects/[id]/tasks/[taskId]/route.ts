import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data: any = {};
    if (body.title !== undefined) data.title = body.title;
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.completed !== undefined) {
      data.completed = body.completed;
      data.completedAt = body.completed ? new Date() : null;
    }

    const task = await prisma.task.update({ where: { id: params.taskId }, data });

    if (body.completed) {
      await prisma.activity.create({
        data: { prospectId: params.id, userId: user.id, type: "TAREA_COMPLETADA", content: `Tarea completada: ${task.title}` },
      });
      await prisma.prospect.update({ where: { id: params.id }, data: { lastActivityAt: new Date() } });
    }

    return NextResponse.json({ task });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  try {
    await requireUser();
    await prisma.task.delete({ where: { id: params.taskId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
