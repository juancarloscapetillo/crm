import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, handleApiError } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminUser();
    const body = await req.json();
    const data: any = {};
    if (body.active !== undefined) data.active = body.active;
    if (body.projectId !== undefined) data.projectId = body.projectId || null;
    const source = await prisma.metaLeadSource.update({ where: { id: params.id }, data });
    return NextResponse.json({ source });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireAdminUser();
    await prisma.metaLeadSource.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
