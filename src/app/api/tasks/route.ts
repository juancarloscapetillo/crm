import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, canManageAllProspects } from "@/lib/api";
import { getAlertStatus, hasOpenFollowUp } from "@/lib/alert";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const completedParam = req.nextUrl.searchParams.get("completed");

    const tasks = await prisma.task.findMany({
      where: {
        completed: completedParam === "true" ? true : completedParam === "false" ? false : undefined,
        prospect: !canManageAllProspects(user.role) ? { assignedUserId: user.id, isDemo: false } : { isDemo: false },
      },
      include: {
        prospect: { select: { id: true, name: true, stage: true, lastActivityAt: true, nextActionDate: true, nextAction: true } },
        assignedUser: true,
        createdBy: true,
      },
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
    });

    // Semáforo por prospecto necesita TODAS sus tareas pendientes (no solo
    // la de esta fila), así que se consultan aparte agrupadas por prospecto.
    const prospectIds = Array.from(new Set(tasks.map((t) => t.prospectId)));
    const pendingTasks = await prisma.task.findMany({
      where: { prospectId: { in: prospectIds }, completed: false },
      select: { prospectId: true, dueDate: true },
    });
    const pendingByProspect = new Map<string, (Date | null)[]>();
    for (const t of pendingTasks) {
      if (!pendingByProspect.has(t.prospectId)) pendingByProspect.set(t.prospectId, []);
      pendingByProspect.get(t.prospectId)!.push(t.dueDate);
    }

    const withAlert = tasks.map((t) => {
      const openFollowUp = hasOpenFollowUp(t.prospect.nextAction, t.prospect.nextActionDate, pendingByProspect.get(t.prospectId) || []);
      return {
        ...t,
        prospectAlertStatus: getAlertStatus(t.prospect.lastActivityAt, t.prospect.stage, openFollowUp),
      };
    });

    return NextResponse.json({ tasks: withAlert });
  } catch (err) {
    return handleApiError(err);
  }
}
