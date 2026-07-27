import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// One-time backfill: tasks created before createdById existed have no
// direct record of who made them. Reconstruct it from the "Tarea creada: X"
// Activity log entry closest in time to each task, within the same
// prospect. Safe to re-run — only touches tasks with no createdById.
async function main() {
  const tasks = await prisma.task.findMany({
    where: { createdById: null },
    select: { id: true, prospectId: true, title: true, createdAt: true },
  });

  let updated = 0;
  let unmatched = 0;
  for (const task of tasks) {
    const candidates = await prisma.activity.findMany({
      where: {
        prospectId: task.prospectId,
        type: "TAREA_CREADA",
        content: `Tarea creada: ${task.title}`,
        userId: { not: null },
      },
      select: { userId: true, createdAt: true },
    });

    if (candidates.length === 0) {
      unmatched++;
      continue;
    }

    const best = candidates.reduce((closest, c) =>
      Math.abs(c.createdAt.getTime() - task.createdAt.getTime()) <
      Math.abs(closest.createdAt.getTime() - task.createdAt.getTime())
        ? c
        : closest
    );

    await prisma.task.update({ where: { id: task.id }, data: { createdById: best.userId } });
    updated++;
  }

  console.log(`Backfill de createdById en tareas: ${updated} actualizadas, ${unmatched} sin coincidencia (de ${tasks.length} pendientes).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
