import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError } from "@/lib/api";
import { getAlertStatus } from "@/lib/alert";
import { getRange, RangeKey } from "@/lib/dateRanges";
import { stageLabels } from "@/lib/labels";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const rangeKey = (sp.get("range") as RangeKey) || "todo";
    const { start, end } = getRange(rangeKey, sp.get("from") || undefined, sp.get("to") || undefined);
    const vendedor = sp.get("vendedor");
    const tag = sp.get("tag");
    const source = sp.get("source");
    const project = sp.get("project");
    const includeDemo = sp.get("includeDemo") === "true";

    const and: Prisma.ProspectWhereInput[] = [];
    if (user.role === "VENDEDOR") and.push({ assignedUserId: user.id });
    if (!includeDemo) and.push({ isDemo: false });
    if (start) and.push({ entryDate: { gte: start, lte: end } });
    else and.push({ entryDate: { lte: end } });
    if (vendedor) and.push({ assignedUserId: vendedor });
    if (tag) and.push({ tags: { some: { tagId: tag } } });
    if (source) and.push({ sourceType: source as any });
    if (project) and.push({ projectId: project });

    const prospects = await prisma.prospect.findMany({
      where: { AND: and },
      include: { tags: { include: { tag: true } }, assignedUser: true },
    });

    const nuevos = prospects.length;
    const activos = prospects.filter((p) => p.stage !== "GANADO" && p.stage !== "PERDIDO");
    const ganados = prospects.filter((p) => p.stage === "GANADO");
    const perdidos = prospects.filter((p) => p.stage === "PERDIDO");
    const conversion = nuevos > 0 ? ganados.length / nuevos : null;
    const ventasGanadas = ganados.reduce((s, p) => s + (p.estimatedValue || 0), 0);

    const sinSeguimiento = activos.filter((p) => {
      const status = getAlertStatus(p.lastActivityAt, p.stage);
      return status === "yellow" || status === "red";
    });

    const marketingWhere: Prisma.MarketingInvestmentWhereInput = { isDemo: includeDemo ? undefined : false };
    if (start) marketingWhere.date = { gte: start, lte: end };
    else marketingWhere.date = { lte: end };
    if (project) marketingWhere.projectId = project;
    const marketingRecords = await prisma.marketingInvestment.findMany({ where: marketingWhere });
    const inversionMarketing = marketingRecords.reduce((s, m) => s + m.amount, 0);
    const cac = ganados.length > 0 ? inversionMarketing / ganados.length : null;

    const asesoresRegistrados = await prisma.advisor.count();
    const advisorActivityCount = await prisma.activity.groupBy({
      by: ["prospectId"],
      where: { createdAt: start ? { gte: start, lte: end } : { lte: end } },
    });
    const activeProspectIds = new Set(advisorActivityCount.map((a) => a.prospectId));
    const advisorsWithActivity = await prisma.prospect.findMany({
      where: { id: { in: Array.from(activeProspectIds) }, advisorId: { not: null } },
      select: { advisorId: true },
    });
    const asesoresActivos = new Set(advisorsWithActivity.map((p) => p.advisorId)).size;

    const tagDist: Record<string, { name: string; color: string; count: number }> = {};
    for (const p of prospects) {
      for (const pt of p.tags) {
        if (!tagDist[pt.tag.id]) tagDist[pt.tag.id] = { name: pt.tag.name, color: pt.tag.color, count: 0 };
        tagDist[pt.tag.id].count++;
      }
    }

    const vendorDist: Record<string, { name: string; count: number }> = {};
    for (const p of prospects) {
      const key = p.assignedUser?.id || "sin_asignar";
      const name = p.assignedUser?.name || "Sin asignar";
      if (!vendorDist[key]) vendorDist[key] = { name, count: 0 };
      vendorDist[key].count++;
    }

    const stageDist: Record<string, { name: string; count: number }> = {};
    for (const p of prospects) {
      if (!stageDist[p.stage]) stageDist[p.stage] = { name: stageLabels[p.stage], count: 0 };
      stageDist[p.stage].count++;
    }

    const bucketByDay = rangeKey === "semana";
    const buckets: Record<string, { label: string; nuevos: number; ganados: number }> = {};
    for (const p of prospects) {
      const d = new Date(p.entryDate);
      const key = bucketByDay
        ? d.toISOString().slice(0, 10)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!buckets[key]) buckets[key] = { label: key, nuevos: 0, ganados: 0 };
      buckets[key].nuevos++;
      if (p.stage === "GANADO") buckets[key].ganados++;
    }
    const evolution = Object.values(buckets).sort((a, b) => a.label.localeCompare(b.label));

    return NextResponse.json({
      kpis: {
        nuevos,
        activos: activos.length,
        ganados: ganados.length,
        perdidos: perdidos.length,
        conversion,
        ventasGanadas,
        inversionMarketing,
        cac,
        asesoresRegistrados,
        asesoresActivos,
        sinSeguimiento: sinSeguimiento.length,
      },
      distribution: {
        tags: Object.values(tagDist),
        vendors: Object.values(vendorDist),
        stages: Object.values(stageDist),
      },
      evolution,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
