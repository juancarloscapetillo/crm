import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, handleApiError, jsonError } from "@/lib/api";

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
    const body = await req.json();
    if (body.confirm !== "BORRAR TODO") {
      return jsonError('Escribe exactamente "BORRAR TODO" para confirmar');
    }

    const [prospects, advisors, companies, tags, marketing] = await Promise.all([
      prisma.prospect.count(),
      prisma.advisor.count(),
      prisma.company.count(),
      prisma.tag.count(),
      prisma.marketingInvestment.count(),
    ]);

    // Prospect delete cascades to ProspectTag, Activity, Task, Attachment, Favorite.
    await prisma.prospect.deleteMany({});
    await prisma.advisor.deleteMany({});
    await prisma.company.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.marketingInvestment.deleteMany({});

    return NextResponse.json({
      deleted: { prospects, advisors, companies, tags, marketing },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
