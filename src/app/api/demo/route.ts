import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, handleApiError, jsonError } from "@/lib/api";
import { Stage, SourceType } from "@prisma/client";

const NAMES = [
  "Roberto Chan", "Fernanda Uc", "Diego Pech", "Valeria Couoh", "Emilio Canul",
  "Paulina Dzul", "Sergio Ek", "Renata Xool", "Andrés Balam", "Camila Tun",
  "Iván Cauich", "Mariana Poot", "Tomás Yam", "Gabriela Chi", "Raúl Cohuo",
  "Ximena Baas", "Manuel Uicab", "Daniela Kú", "Alejandro May", "Sofía Chable",
];
const LOSS_REASONS = ["Presupuesto insuficiente", "Eligió otra desarrolladora", "No calificó a crédito", "Dejó de responder"];
const CHANNELS = ["Facebook Ads", "Google Ads", "Referidos", "Círculo Calume", "Instagram Ads"];

export async function POST() {
  try {
    const admin = await requireAdminUser();

    const existing = await prisma.prospect.count({ where: { isDemo: true } });
    if (existing > 0) return jsonError("Ya existen datos demostrativos. Elimínalos primero si deseas regenerarlos.", 409);

    const tags = await prisma.tag.findMany();
    if (tags.length === 0) return jsonError("No hay tags configurados para generar datos demo", 400);

    let project = await prisma.project.findFirst();
    if (!project) project = await prisma.project.create({ data: { name: "Muretto" } });

    const vendedores = await prisma.user.findMany({ where: { role: "VENDEDOR" } });
    const assignees = vendedores.length ? vendedores : [admin];

    const stages: Stage[] = ["INFORMES", "VISITA", "NEGOCIACION", "GANADO", "PERDIDO"];
    const sources: SourceType[] = ["DIRECTO", "ASESOR_EXTERNO", "COMUNIDAD", "REFERIDO", "CAMPANA"];

    for (let i = 0; i < NAMES.length; i++) {
      const stage = stages[i % stages.length];
      const daysAgo = Math.floor(Math.random() * 90);
      const entryDate = new Date(Date.now() - daysAgo * 86400000);
      const lastActivityAgoHours = stage === "GANADO" || stage === "PERDIDO" ? 200 : Math.random() * 140;
      const lastActivityAt = new Date(Date.now() - lastActivityAgoHours * 3600000);
      const vendedor = assignees[i % assignees.length];
      const source = sources[i % sources.length];
      const estimatedValue = 1800000 + (i % 6) * 250000;

      const prospect = await prisma.prospect.create({
        data: {
          name: NAMES[i],
          phone: `999-${String(100 + i).padStart(3, "0")}-${String(1000 + i * 7).slice(-4)}`,
          email: `${NAMES[i].toLowerCase().replace(/\s+/g, ".")}@example.com`,
          sourceType: source,
          assignedUserId: vendedor.id,
          projectId: project.id,
          unitInterest: i % 2 === 0 ? "2 recámaras" : "1 recámara",
          budget: estimatedValue,
          paymentMethod: i % 3 === 0 ? "Crédito bancario" : i % 3 === 1 ? "Contado" : "Infonavit",
          entryDate,
          stage,
          stageEnteredAt: entryDate,
          estimatedValue,
          lossReason: stage === "PERDIDO" ? LOSS_REASONS[i % LOSS_REASONS.length] : null,
          lastActivityAt,
          isDemo: true,
          tags: { create: [{ tagId: tags[i % tags.length].id }] },
        },
      });

      await prisma.activity.create({
        data: {
          prospectId: prospect.id,
          userId: vendedor.id,
          type: "CREACION",
          content: "Prospecto creado (dato demostrativo)",
          createdAt: entryDate,
        },
      });
    }

    for (let m = 0; m < 4; m++) {
      const date = new Date();
      date.setMonth(date.getMonth() - m, 5);
      for (const channel of CHANNELS) {
        const leads = 5 + Math.floor(Math.random() * 15);
        const sales = Math.floor(leads * (0.05 + Math.random() * 0.1));
        await prisma.marketingInvestment.create({
          data: {
            period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
            date,
            projectId: project.id,
            campaign: `Campaña ${channel} #${m + 1}`,
            channel,
            provider: "Agencia Demo",
            amount: 8000 + Math.floor(Math.random() * 25000),
            description: "Registro demostrativo",
            leadsGenerated: leads,
            visitsGenerated: Math.floor(leads * 0.4),
            salesAttributed: sales,
            revenueAttributed: sales * 2200000,
            isDemo: true,
            createdById: admin.id,
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    await requireAdminUser();
    await prisma.prospect.deleteMany({ where: { isDemo: true } });
    await prisma.marketingInvestment.deleteMany({ where: { isDemo: true } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
