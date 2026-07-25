import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError } from "@/lib/api";
import { getAlertStatus } from "@/lib/alert";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const completedParam = req.nextUrl.searchParams.get("completed");

    const tasks = await prisma.task.findMany({
      where: {
        completed: completedParam === "true" ? true : completedParam === "false" ? false : undefined,
        prospect: user.role === "VENDEDOR" ? { assignedUserId: user.id } : undefined,
      },
      include: {
        prospect: { select: { id: true, name: true, stage: true, lastActivityAt: true, isDemo: true } },
        assignedUser: true,
      },
      orderBy: [{ completed: "asc" }, { dueDate: "asc" }],
    });

    const withAlert = tasks.map((t) => ({
      ...t,
      prospectAlertStatus: getAlertStatus(t.prospect.lastActivityAt, t.prospect.stage),
    }));

    return NextResponse.json({ tasks: withAlert });
  } catch (err) {
    return handleApiError(err);
  }
}
