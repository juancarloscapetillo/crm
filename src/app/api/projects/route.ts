import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError } from "@/lib/api";

export async function GET() {
  try {
    await requireUser();
    const projects = await prisma.project.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({ projects });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();
    const body = await req.json();
    if (!body.name?.trim()) return jsonError("El nombre del proyecto es obligatorio");
    const project = await prisma.project.create({ data: { name: body.name.trim() } });
    return NextResponse.json({ project }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") return jsonError("Ya existe un proyecto con ese nombre", 409);
    return handleApiError(err);
  }
}
