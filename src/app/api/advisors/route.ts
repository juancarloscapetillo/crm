import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError } from "@/lib/api";
import { daysSinceLastActive } from "@/lib/alert";

export async function GET() {
  try {
    await requireUser();
    const advisors = await prisma.advisor.findMany({
      orderBy: { name: "asc" },
      include: {
        company: true,
        prospects: { select: { id: true, stage: true, estimatedValue: true, lastActivityAt: true } },
      },
    });

    const result = advisors.map((a) => {
      const total = a.prospects.length;
      const won = a.prospects.filter((p) => p.stage === "GANADO");
      const activeProspects = a.prospects.filter((p) => p.stage !== "GANADO" && p.stage !== "PERDIDO");
      const revenue = won.reduce((s, p) => s + (p.estimatedValue || 0), 0);
      return {
        id: a.id,
        name: a.name,
        phone: a.phone,
        email: a.email,
        active: a.active,
        registeredAt: a.registeredAt,
        company: a.company ? { id: a.company.id, name: a.company.commercialName } : null,
        prospectCount: total,
        activeProspectCount: activeProspects.length,
        salesCount: won.length,
        conversion: total > 0 ? won.length / total : null,
        revenue,
        daysSinceActiveProspect: daysSinceLastActive(activeProspects.length, a.prospects, a.registeredAt),
      };
    });

    return NextResponse.json({ advisors: result });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    if (!body.name?.trim()) return jsonError("El nombre del asesor es obligatorio");
    const advisor = await prisma.advisor.create({
      data: {
        name: body.name.trim(),
        phone: body.phone || null,
        email: body.email || null,
        companyId: body.companyId || null,
        active: body.active ?? true,
      },
    });
    return NextResponse.json({ advisor }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
