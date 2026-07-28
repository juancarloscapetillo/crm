import { PrismaClient, Stage } from "@prisma/client";

const prisma = new PrismaClient();

const stageLabels: Record<Stage, string> = {
  SIN_CONTACTAR: "🆕 Sin contactar",
  INFORMES: "📥 Informes",
  VISITA: "📅 Visita",
  NEGOCIACION: "🤝 Negociación",
  APARTADO: "🔒 Apartado",
  GANADO: "✅ Ganado",
  PERDIDO: "❌ Perdido",
};

const stageRank: Record<Stage, number> = {
  SIN_CONTACTAR: 0,
  INFORMES: 1,
  VISITA: 2,
  NEGOCIACION: 3,
  APARTADO: 4,
  GANADO: 5,
  PERDIDO: -1,
};

const labelToStage: Record<string, Stage> = Object.fromEntries(
  Object.entries(stageLabels).map(([stage, label]) => [label, stage as Stage])
) as Record<string, Stage>;

// One-time backfill: for existing prospects, reconstruct the highest funnel
// stage they ever reached (ignoring PERDIDO, which is an outcome, not a
// stage of progress) from their CAMBIO_ETAPA activity trail. Safe to re-run.
async function main() {
  const prospects = await prisma.prospect.findMany({
    select: {
      id: true,
      stage: true,
      maxStage: true,
      activities: {
        where: { type: "CAMBIO_ETAPA" },
        orderBy: { createdAt: "asc" },
        select: { fromValue: true, toValue: true },
      },
    },
  });

  let updated = 0;
  for (const p of prospects) {
    let best: Stage | null = null;
    const consider = (label: string | null) => {
      const stage = label ? labelToStage[label] : undefined;
      if (stage && (best === null || stageRank[stage] > stageRank[best])) best = stage;
    };

    for (const a of p.activities) {
      consider(a.fromValue);
      consider(a.toValue);
    }
    if (p.stage !== "PERDIDO" && (best === null || stageRank[p.stage] > stageRank[best])) best = p.stage;

    // No stage-change history and currently lost: assume it was at least
    // contacted (INFORMES) before being marked as lost.
    if (best === null) best = p.stage === "PERDIDO" ? "INFORMES" : p.stage;

    if (best !== p.maxStage) {
      await prisma.prospect.update({ where: { id: p.id }, data: { maxStage: best } });
      updated++;
    }
  }

  console.log(`Backfill de maxStage completo: ${updated}/${prospects.length} prospectos actualizados.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
