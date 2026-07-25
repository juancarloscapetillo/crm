import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { prospects: true } } },
    });
    return NextResponse.json({ tags });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    if (!body.name?.trim()) return jsonError("El nombre del tag es obligatorio");
    const tag = await prisma.tag.create({
      data: { name: body.name.trim().replace(/^#/, ""), color: body.color || "#253574" },
    });
    return NextResponse.json({ tag }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") return jsonError("Ya existe un tag con ese nombre", 409);
    return handleApiError(err);
  }
}
