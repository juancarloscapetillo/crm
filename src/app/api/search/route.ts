import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, canManageAllProspects } from "@/lib/api";
import { stageLabels } from "@/lib/labels";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    const scope = req.nextUrl.searchParams.get("scope") || "prospects";
    if (q.length < 2) return NextResponse.json({ results: [] });

    if (scope === "advisors") {
      const [advisors, companies] = await Promise.all([
        prisma.advisor.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
          include: { company: true },
          take: 8,
          orderBy: { name: "asc" },
        }),
        prisma.company.findMany({
          where: {
            OR: [
              { commercialName: { contains: q, mode: "insensitive" } },
              { contactName: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 8,
          orderBy: { commercialName: "asc" },
        }),
      ]);

      return NextResponse.json({
        results: [
          ...advisors.map((a) => ({
            id: a.id,
            name: a.name,
            stage: a.company ? a.company.commercialName : "Asesor independiente",
            type: "asesor" as const,
          })),
          ...companies.map((c) => ({
            id: c.id,
            name: c.commercialName,
            stage: "Inmobiliaria",
            type: "inmobiliaria" as const,
          })),
        ].slice(0, 8),
      });
    }

    const prospects = await prisma.prospect.findMany({
      where: {
        AND: [
          !canManageAllProspects(user.role) ? { assignedUserId: user.id } : {},
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      results: prospects.map((p) => ({ id: p.id, name: p.name, stage: stageLabels[p.stage], type: "prospecto" as const })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
