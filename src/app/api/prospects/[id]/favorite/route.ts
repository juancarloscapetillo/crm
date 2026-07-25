import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError } from "@/lib/api";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const existing = await prisma.favorite.findUnique({
      where: { userId_prospectId: { userId: user.id, prospectId: params.id } },
    });
    if (existing) {
      await prisma.favorite.delete({ where: { id: existing.id } });
      return NextResponse.json({ isFavorite: false });
    }
    await prisma.favorite.create({ data: { userId: user.id, prospectId: params.id } });
    return NextResponse.json({ isFavorite: true });
  } catch (err) {
    return handleApiError(err);
  }
}
