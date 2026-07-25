import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const includeDemo = req.nextUrl.searchParams.get("includeDemo") === "true";
    const records = await prisma.marketingInvestment.findMany({
      where: includeDemo ? {} : { isDemo: false },
      include: { project: true },
      orderBy: { date: "desc" },
    });
    return NextResponse.json({ records });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    if (!body.campaign?.trim() || !body.amount) {
      return jsonError("Concepto y monto son obligatorios");
    }
    const record = await prisma.marketingInvestment.create({
      data: {
        period: body.period || new Date(body.date || Date.now()).toISOString().slice(0, 7),
        date: body.date ? new Date(body.date) : new Date(),
        projectId: body.projectId || null,
        campaign: body.campaign.trim(),
        channel: body.channel?.trim() || null,
        provider: body.provider || null,
        amount: Number(body.amount),
        description: body.description || null,
        tags: body.tags || null,
        leadsGenerated: Number(body.leadsGenerated) || 0,
        visitsGenerated: Number(body.visitsGenerated) || 0,
        salesAttributed: Number(body.salesAttributed) || 0,
        revenueAttributed: Number(body.revenueAttributed) || 0,
        createdById: user.id,
      },
    });
    return NextResponse.json({ record }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
