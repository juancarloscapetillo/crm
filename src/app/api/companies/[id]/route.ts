import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdminUser, handleApiError, jsonError } from "@/lib/api";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        advisors: true,
        prospects: {
          include: { assignedUser: true, project: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!company) return jsonError("Empresa no encontrada", 404);

    const total = company.prospects.length;
    const won = company.prospects.filter((p) => p.stage === "GANADO");
    const revenue = won.reduce((s, p) => s + (p.estimatedValue || 0), 0);

    return NextResponse.json({
      company: {
        ...company,
        stats: {
          prospectCount: total,
          salesCount: won.length,
          conversion: total > 0 ? won.length / total : null,
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
    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        commercialName: body.commercialName,
        legalName: body.legalName,
        contactName: body.contactName,
        phone: body.phone,
        email: body.email,
        address: body.address,
        notes: body.notes,
        active: body.active,
      },
    });
    return NextResponse.json({ company });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminUser();
    await prisma.company.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
