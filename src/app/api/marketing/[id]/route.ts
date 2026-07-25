import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const body = await req.json();
    const data: any = {};
    const fields = ["period", "campaign", "channel", "provider", "description", "tags", "projectId"];
    for (const f of fields) if (body[f] !== undefined) data[f] = body[f] || null;
    const numFields = ["amount", "leadsGenerated", "visitsGenerated", "salesAttributed", "revenueAttributed"];
    for (const f of numFields) if (body[f] !== undefined) data[f] = Number(body[f]) || 0;
    if (body.date !== undefined) data.date = new Date(body.date);

    const record = await prisma.marketingInvestment.update({ where: { id: params.id }, data });
    return NextResponse.json({ record });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    await prisma.marketingInvestment.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
