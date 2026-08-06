import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, canManageAllProspects } from "@/lib/api";
import { getRange, RangeKey } from "@/lib/dateRanges";
import { getAlertStatus, hoursSince } from "@/lib/alert";
import { stageLabels, stageOrder } from "@/lib/labels";
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
    const and: Prisma.ProspectWhereInput[] = [];
    if (!canManageAllProspects(user.role)) and.push({ assignedUserId: user.id });
    and.push({ isDemo: false });
    if (start) and.push({ entryDate: { gte: start, lte: end } });
    else and.push({ entryDate: { lte: end } });
    if (vendedor) and.push({ assignedUserId: vendedor });
    if (tag) and.push({ tags: { some: { tagId: tag } } });
    if (source) and.push({ sourceType: source as any });
    if (project) and.push({ projectId: project });

    const prospects = await prisma.prospect.findMany({
      where: { AND: and },
      include: { assignedUser: true, advisor: { include: { company: true } }, company: true, tags: { include: { tag: true } } },
    });

    const marketingWhere: Prisma.MarketingInvestmentWhereInput = { isDemo: false };
    if (start) marketingWhere.date = { gte: start, lte: end };
    else marketingWhere.date = { lte: end };
    if (project) marketingWhere.projectId = project;
    const marketing = await prisma.marketingInvestment.findMany({ where: marketingWhere });

    const won = prospects.filter((p) => p.stage === "GANADO");
    const lost = prospects.filter((p) => p.stage === "PERDIDO");
    const active = prospects.filter((p) => p.stage !== "GANADO" && p.stage !== "PERDIDO");
    const totalInvestment = marketing.reduce((s, m) => s + m.amount, 0);

    // Conversión por etapa (embudo)
    const byStage = stageOrder.map((s) => ({
      stage: stageLabels[s],
      count: prospects.filter((p) => p.stage === s).length,
    }));

    // Motivos de pérdida
    const lossReasonsMap: Record<string, number> = {};
    for (const p of lost) {
      const reason = p.lossReason || "Sin especificar";
      lossReasonsMap[reason] = (lossReasonsMap[reason] || 0) + 1;
    }
    const lossReasons = Object.entries(lossReasonsMap).map(([reason, count]) => ({ reason, count }));

    // Conversión por vendedor
    const vendorMap: Record<string, { name: string; total: number; won: number; value: number }> = {};
    for (const p of prospects) {
      const key = p.assignedUser?.id || "sin_asignar";
      const name = p.assignedUser?.name || "Sin asignar";
      vendorMap[key] ||= { name, total: 0, won: 0, value: 0 };
      vendorMap[key].total++;
      if (p.stage === "GANADO") {
        vendorMap[key].won++;
        vendorMap[key].value += p.estimatedValue || 0;
      }
    }
    const byVendor = Object.values(vendorMap).map((v) => ({
      ...v,
      conversion: v.total > 0 ? v.won / v.total : null,
    }));

    // Conversión por asesor externo
    const advisorMap: Record<string, { name: string; company: string; total: number; won: number; value: number }> = {};
    for (const p of prospects) {
      if (!p.advisor) continue;
      advisorMap[p.advisor.id] ||= { name: p.advisor.name, company: p.advisor.company?.commercialName || "Independiente", total: 0, won: 0, value: 0 };
      advisorMap[p.advisor.id].total++;
      if (p.stage === "GANADO") {
        advisorMap[p.advisor.id].won++;
        advisorMap[p.advisor.id].value += p.estimatedValue || 0;
      }
    }
    const byAdvisor = Object.values(advisorMap).map((v) => ({ ...v, conversion: v.total > 0 ? v.won / v.total : null }));

    // Conversión por empresa
    const companyMap: Record<string, { name: string; total: number; won: number; value: number }> = {};
    for (const p of prospects) {
      const compId = p.companyId || p.advisor?.companyId;
      const compName = p.company?.commercialName || p.advisor?.company?.commercialName;
      if (!compId || !compName) continue;
      companyMap[compId] ||= { name: compName, total: 0, won: 0, value: 0 };
      companyMap[compId].total++;
      if (p.stage === "GANADO") {
        companyMap[compId].won++;
        companyMap[compId].value += p.estimatedValue || 0;
      }
    }
    const byCompany = Object.values(companyMap).map((v) => ({ ...v, conversion: v.total > 0 ? v.won / v.total : null }));

    // Conversión por tag
    const tagMap: Record<string, { name: string; total: number; won: number }> = {};
    for (const p of prospects) {
      for (const pt of p.tags) {
        tagMap[pt.tag.id] ||= { name: pt.tag.name, total: 0, won: 0 };
        tagMap[pt.tag.id].total++;
        if (p.stage === "GANADO") tagMap[pt.tag.id].won++;
      }
    }
    const byTag = Object.values(tagMap).map((v) => ({ ...v, conversion: v.total > 0 ? v.won / v.total : null }));

    // Conversión por canal (source type)
    const sourceMap: Record<string, { name: string; total: number; won: number }> = {};
    for (const p of prospects) {
      sourceMap[p.sourceType] ||= { name: p.sourceType, total: 0, won: 0 };
      sourceMap[p.sourceType].total++;
      if (p.stage === "GANADO") sourceMap[p.sourceType].won++;
    }
    const byChannel = Object.values(sourceMap).map((v) => ({ ...v, conversion: v.total > 0 ? v.won / v.total : null }));

    // Tiempo promedio de cierre (creación -> ganado), aproximado con stageEnteredAt de ganados
    const closeTimes = won.map((p) => (new Date(p.stageEnteredAt).getTime() - new Date(p.entryDate).getTime()) / 86400000);
    const avgCloseTimeDays = closeTimes.length > 0 ? closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length : null;

    // Tiempo promedio sin seguimiento (horas desde última actividad, solo activos)
    const noFollowHours = active.map((p) => hoursSince(p.lastActivityAt));
    const avgNoFollowHours = noFollowHours.length > 0 ? noFollowHours.reduce((a, b) => a + b, 0) / noFollowHours.length : null;

    // Marketing por periodo / CAC por periodo
    const periodMap: Record<string, { period: string; amount: number; leads: number; sales: number }> = {};
    for (const m of marketing) {
      periodMap[m.period] ||= { period: m.period, amount: 0, leads: 0, sales: 0 };
      periodMap[m.period].amount += m.amount;
      periodMap[m.period].leads += m.leadsGenerated;
      periodMap[m.period].sales += m.salesAttributed;
    }
    const byPeriod = Object.values(periodMap)
      .map((p) => ({ ...p, cac: p.sales > 0 ? p.amount / p.sales : null }))
      .sort((a, b) => a.period.localeCompare(b.period));

    // Productividad por vendedor (prospectos atendidos, tareas completadas)
    const users = await prisma.user.findMany({ where: { role: { not: "ADMIN" } } });
    const activityCounts = await prisma.activity.groupBy({
      by: ["userId"],
      _count: { id: true },
      where: { createdAt: start ? { gte: start, lte: end } : { lte: end } },
    });
    const activityMap = Object.fromEntries(activityCounts.map((a) => [a.userId, a._count.id]));
    const productivity = users.map((u) => ({
      name: u.name,
      prospectsAssigned: prospects.filter((p) => p.assignedUserId === u.id).length,
      won: prospects.filter((p) => p.assignedUserId === u.id && p.stage === "GANADO").length,
      activities: activityMap[u.id] || 0,
    }));

    return NextResponse.json({
      summary: {
        nuevos: prospects.length,
        activos: active.length,
        ganados: won.length,
        perdidos: lost.length,
        valorPipeline: active.reduce((s, p) => s + (p.estimatedValue || 0), 0),
        valorGanado: won.reduce((s, p) => s + (p.estimatedValue || 0), 0),
        inversionTotal: totalInvestment,
        cacGeneral: won.length > 0 ? totalInvestment / won.length : null,
        avgCloseTimeDays,
        avgNoFollowHours,
        asesoresRegistrados: await prisma.advisor.count(),
      },
      byStage,
      lossReasons,
      byVendor,
      byAdvisor,
      byCompany,
      byTag,
      byChannel,
      byPeriod,
      productivity,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
