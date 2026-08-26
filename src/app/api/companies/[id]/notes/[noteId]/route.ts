import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: { id: string; noteId: string } }) {
  try {
    await requireUser();
    const body = await req.json();

    if (body.pinned !== undefined) {
      if (body.pinned) {
        await prisma.note.updateMany({
          where: { companyId: params.id, pinned: true },
          data: { pinned: false },
        });
      }
      await prisma.note.update({ where: { id: params.noteId }, data: { pinned: body.pinned } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
