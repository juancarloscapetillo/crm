import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdminUser, handleApiError, jsonError } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const advisor = await prisma.advisor.findUnique({
      where: { id: params.id },
      include: {
        company: true,
        prospects: { include: { assignedUser: true, project: true }, orderBy: { createdAt: "desc" } },
        notes: { include: { user: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!advisor) return jsonError("Asesor no encontrado", 404);

    const total = advisor.prospects.length;
    const won = advisor.prospects.filter((p) => p.stage === "GANADO");
    const visits = await prisma.activity.count({
      where: { type: "VISITA", prospect: { advisorId: advisor.id } },
    });
    const revenue = won.reduce((s, p) => s + (p.estimatedValue || 0), 0);

    return NextResponse.json({
      advisor: {
        ...advisor,
        stats: {
          prospectCount: total,
          activeProspectCount: advisor.prospects.filter((p) => p.stage !== "GANADO" && p.stage !== "PERDIDO").length,
          salesCount: won.length,
          conversion: total > 0 ? won.length / total : null,
          visitsGenerated: visits,
          revenue,
        },
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const body = await req.json();
    const advisor = await prisma.advisor.update({
      where: { id: params.id },
      data: {
        name: body.name,
        phone: body.phone,
        email: body.email,
        companyId: body.companyId || null,
        active: body.active,
      },
    });
    return NextResponse.json({ advisor });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminUser();
    await prisma.advisor.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
