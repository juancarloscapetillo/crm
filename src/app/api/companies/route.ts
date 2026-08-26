import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError } from "@/lib/api";
import { daysSinceLastActive } from "@/lib/alert";

export async function GET() {
  try {
    await requireUser();
    const companies = await prisma.company.findMany({
      orderBy: { commercialName: "asc" },
      include: {
        advisors: { select: { id: true } },
        prospects: { select: { id: true, stage: true, estimatedValue: true, lastActivityAt: true } },
      },
    });

    const result = companies.map((c) => {
      const total = c.prospects.length;
      const won = c.prospects.filter((p) => p.stage === "GANADO");
      const activeProspects = c.prospects.filter((p) => p.stage !== "GANADO" && p.stage !== "PERDIDO");
      const sales = won.length;
      const revenue = won.reduce((s, p) => s + (p.estimatedValue || 0), 0);
      return {
        id: c.id,
        commercialName: c.commercialName,
        legalName: c.legalName,
        contactName: c.contactName,
        phone: c.phone,
        email: c.email,
        address: c.address,
        active: c.active,
        advisorCount: c.advisors.length,
        prospectCount: total,
        activeProspectCount: activeProspects.length,
        salesCount: sales,
        conversion: total > 0 ? sales / total : null,
        revenue,
        daysSinceActiveProspect: daysSinceLastActive(activeProspects.length, c.prospects, c.createdAt),
      };
    });

    return NextResponse.json({ companies: result });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    if (!body.commercialName?.trim()) return jsonError("El nombre comercial es obligatorio");
    const company = await prisma.company.create({
      data: {
        commercialName: body.commercialName.trim(),
        legalName: body.legalName || null,
        contactName: body.contactName || null,
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        notes: body.notes || null,
        active: body.active ?? true,
      },
    });
    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
