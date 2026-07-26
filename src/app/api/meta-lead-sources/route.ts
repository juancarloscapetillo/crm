import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, handleApiError, jsonError } from "@/lib/api";
import { encryptSecret } from "@/lib/crypto";
import { verifyPageAccessToken } from "@/lib/meta";

export async function GET() {
  try {
    await requireAdminUser();
    const sources = await prisma.metaLeadSource.findMany({
      include: { project: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      sources: sources.map((s) => ({
        id: s.id,
        pageId: s.pageId,
        pageName: s.pageName,
        project: s.project,
        active: s.active,
        createdAt: s.createdAt,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
    const body = await req.json();
    const pageId = body.pageId?.trim();
    const token = body.pageAccessToken?.trim();
    if (!pageId || !token) return jsonError("La página y el token de acceso son obligatorios");

    const check = await verifyPageAccessToken(pageId, token);
    if (!check.valid) return jsonError("No se pudo validar el ID de página y el token con Meta. Revísalos e intenta de nuevo.");

    const source = await prisma.metaLeadSource.create({
      data: {
        pageId,
        pageName: check.pageName || null,
        pageAccessTokenEnc: encryptSecret(token),
        projectId: body.projectId || null,
      },
    });
    return NextResponse.json({ source }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") return jsonError("Esa página ya está conectada", 409);
    return handleApiError(err);
  }
}
