import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError } from "@/lib/api";
import { stageLabels } from "@/lib/labels";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    if (q.length < 2) return NextResponse.json({ results: [] });

    const prospects = await prisma.prospect.findMany({
      where: {
        AND: [
          user.role === "VENDEDOR" ? { assignedUserId: user.id } : {},
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
      results: prospects.map((p) => ({ id: p.id, name: p.name, stage: stageLabels[p.stage], type: "prospecto" })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
