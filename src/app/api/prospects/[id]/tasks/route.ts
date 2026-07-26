import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError } from "@/lib/api";
import { pushTaskToTodoist } from "@/lib/todoist";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json();
    if (!body.title?.trim()) return jsonError("El título de la tarea es obligatorio");

    const prospect = await prisma.prospect.findUnique({ where: { id: params.id }, select: { name: true } });

    const task = await prisma.task.create({
      data: {
        prospectId: params.id,
        title: body.title.trim(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        assignedUserId: body.assignedUserId || user.id,
      },
    });

    await prisma.activity.create({
      data: { prospectId: params.id, userId: user.id, type: "TAREA_CREADA", content: `Tarea creada: ${task.title}` },
    });
    await prisma.prospect.update({ where: { id: params.id }, data: { lastActivityAt: new Date() } });

    if (task.assignedUserId) {
      const todoistTaskId = await pushTaskToTodoist(
        task.assignedUserId,
        prospect ? `${task.title} — ${prospect.name}` : task.title,
        task.dueDate
      );
      if (todoistTaskId) await prisma.task.update({ where: { id: task.id }, data: { todoistTaskId } });
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
