import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError } from "@/lib/api";
import { getAlertStatus } from "@/lib/alert";

function buildWhere(searchParams: URLSearchParams, userId: string, role: string): Prisma.ProspectWhereInput {
  const where: Prisma.ProspectWhereInput = {};
  const and: Prisma.ProspectWhereInput[] = [];

  if (role !== "ADMIN") and.push({ assignedUserId: userId });

  const vendedor = searchParams.get("vendedor");
  if (vendedor) and.push({ assignedUserId: vendedor });

  const stage = searchParams.get("stage");
  if (stage) and.push({ stage: stage as any });

  const tag = searchParams.get("tag");
  if (tag) and.push({ tags: { some: { tagId: tag } } });

  const source = searchParams.get("source");
  if (source) and.push({ sourceType: source as any });

  const project = searchParams.get("project");
  if (project) and.push({ projectId: project });

  const advisor = searchParams.get("advisor");
  if (advisor) and.push({ advisorId: advisor });

  const company = searchParams.get("company");
  if (company) and.push({ companyId: company });

  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (from || to) {
    and.push({
      entryDate: {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
      },
    });
  }

  const q = searchParams.get("q");
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const includeDemo = searchParams.get("includeDemo");
  if (includeDemo !== "true") and.push({ isDemo: false });

  const favorite = searchParams.get("favorite");
  if (favorite === "true") and.push({ favoritedBy: { some: { userId } } });

  if (and.length) where.AND = and;
  return where;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const where = buildWhere(req.nextUrl.searchParams, user.id, user.role);

    let prospects = await prisma.prospect.findMany({
      where,
      include: {
        assignedUser: true,
        project: true,
        advisor: true,
        company: true,
        tags: { include: { tag: true } },
        favoritedBy: { where: { userId: user.id } },
        _count: { select: { tasks: { where: { completed: false } } } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const alertFilter = req.nextUrl.searchParams.get("alert");
    const withAlert = prospects.map((p) => ({
      ...p,
      alertStatus: getAlertStatus(p.lastActivityAt, p.stage),
      isFavorite: p.favoritedBy.length > 0,
    }));

    let filtered = withAlert;
    if (alertFilter && alertFilter !== "todos") {
      if (alertFilter === "sin_actividad") {
        filtered = withAlert.filter((p) => !p.nextActionDate);
      } else if (alertFilter === "vencido") {
        filtered = withAlert.filter((p) => p.nextActionDate && new Date(p.nextActionDate) < new Date());
      } else {
        filtered = withAlert.filter((p) => p.alertStatus === alertFilter);
      }
    }

    return NextResponse.json({ prospects: filtered });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    if (!body.name?.trim()) return jsonError("El nombre del prospecto es obligatorio");

    const now = new Date();
    const prospect = await prisma.prospect.create({
      data: {
        name: body.name.trim(),
        phone: body.phone || null,
        email: body.email || null,
        companyName: body.companyName || null,
        sourceType: body.sourceType || "DIRECTO",
        companyId: body.companyId || null,
        advisorId: body.advisorId || null,
        assignedUserId: body.assignedUserId || (user.role !== "ADMIN" ? user.id : null),
        projectId: body.projectId || null,
        unitInterest: body.unitInterest || null,
        budget: body.budget ? Number(body.budget) : null,
        paymentMethod: body.paymentMethod || null,
        estimatedValue: body.estimatedValue ? Number(body.estimatedValue) : null,
        notes: body.notes || null,
        nextAction: body.nextAction || null,
        nextActionDate: body.nextActionDate ? new Date(body.nextActionDate) : null,
        stage: "SIN_CONTACTAR",
        stageEnteredAt: now,
        lastActivityAt: now,
        entryDate: now,
        tags: body.tagIds?.length ? { create: body.tagIds.map((id: string) => ({ tagId: id })) } : undefined,
        activities: {
          create: {
            type: "CREACION",
            content: "Prospecto creado",
            userId: user.id,
          },
        },
      },
      include: { tags: { include: { tag: true } }, assignedUser: true },
    });

    return NextResponse.json({ prospect }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
