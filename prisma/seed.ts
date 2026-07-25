import { PrismaClient, Stage, SourceType, ActivityType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Sembrando datos base (usuarios, tags, catálogos)...");

  const adminPass = await bcrypt.hash("Calume2026!", 10);
  const vendedorPass = await bcrypt.hash("Vendedor2026!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@calume.mx" },
    update: {},
    create: {
      name: "Administrador Calume",
      email: "admin@calume.mx",
      passwordHash: adminPass,
      role: "ADMIN",
    },
  });

  const vendedor1 = await prisma.user.upsert({
    where: { email: "vendedor1@calume.mx" },
    update: {},
    create: {
      name: "Ana Vendedora",
      email: "vendedor1@calume.mx",
      passwordHash: vendedorPass,
      role: "VENDEDOR",
    },
  });

  const vendedor2 = await prisma.user.upsert({
    where: { email: "vendedor2@calume.mx" },
    update: {},
    create: {
      name: "Luis Vendedor",
      email: "vendedor2@calume.mx",
      passwordHash: vendedorPass,
      role: "VENDEDOR",
    },
  });

  const vendedor3 = await prisma.user.upsert({
    where: { email: "vendedor3@calume.mx" },
    update: {},
    create: {
      name: "María Vendedora",
      email: "vendedor3@calume.mx",
      passwordHash: vendedorPass,
      role: "VENDEDOR",
    },
  });

  const tagsData = [
    { name: "ComunidadCalume", color: "#5B8DEF" },
    { name: "Directo", color: "#3FBE7A" },
    { name: "CirculoCalume", color: "#9B6FD9" },
    { name: "Referido", color: "#F6B436" },
  ];
  const tags = [];
  for (const t of tagsData) {
    tags.push(await prisma.tag.upsert({ where: { name: t.name }, update: {}, create: t }));
  }

  const project = await prisma.project.upsert({
    where: { name: "Muretto" },
    update: {},
    create: { name: "Muretto" },
  });
  await prisma.project.upsert({
    where: { name: "Temozón Norte" },
    update: {},
    create: { name: "Temozón Norte" },
  });

  const company = await prisma.company.upsert({
    where: { id: "seed-company-1" },
    update: {},
    create: {
      id: "seed-company-1",
      commercialName: "Inmobiliaria Península",
      legalName: "Inmobiliaria Península S.A. de C.V.",
      contactName: "Jorge Peón",
      phone: "999-123-4567",
      email: "contacto@peninsula.mx",
      address: "Mérida, Yucatán",
      active: true,
    },
  });

  await prisma.advisor.upsert({
    where: { id: "seed-advisor-1" },
    update: {},
    create: {
      id: "seed-advisor-1",
      name: "Carla Ruiz",
      phone: "999-555-0101",
      email: "carla@peninsula.mx",
      companyId: company.id,
      active: true,
    },
  });

  console.log("Usuarios de prueba:");
  console.log("  admin@calume.mx / Calume2026!");
  console.log("  vendedor1@calume.mx / Vendedor2026!");

  const demoFlag = process.argv.includes("--demo");
  if (demoFlag) {
    await seedDemoData({ admin, vendedores: [vendedor1, vendedor2, vendedor3], tags, project });
  }
}

async function seedDemoData({ admin, vendedores, tags, project }: any) {
  console.log("Generando datos demostrativos de analítica...");
  const existingDemo = await prisma.prospect.count({ where: { isDemo: true } });
  if (existingDemo > 0) {
    console.log("Ya existen datos demo, se omite.");
    return;
  }

  const stages: Stage[] = ["INFORMES", "VISITA", "NEGOCIACION", "GANADO", "PERDIDO"];
  const sources: SourceType[] = ["DIRECTO", "ASESOR_EXTERNO", "COMUNIDAD", "REFERIDO", "CAMPANA"];
  const names = [
    "Roberto Chan", "Fernanda Uc", "Diego Pech", "Valeria Couoh", "Emilio Canul",
    "Paulina Dzul", "Sergio Ek", "Renata Xool", "Andrés Balam", "Camila Tun",
    "Iván Cauich", "Mariana Poot", "Tomás Yam", "Gabriela Chi", "Raúl Cohuo",
    "Ximena Baas", "Manuel Uicab", "Daniela Kú", "Alejandro May", "Sofía Chable",
  ];

  const lossReasons = ["Presupuesto insuficiente", "Eligió otra desarrolladora", "No calificó a crédito", "Dejó de responder"];

  for (let i = 0; i < names.length; i++) {
    const stage = stages[i % stages.length];
    const daysAgo = Math.floor(Math.random() * 90);
    const entryDate = new Date(Date.now() - daysAgo * 86400000);
    const lastActivityAgoHours = stage === "GANADO" || stage === "PERDIDO" ? 200 : Math.random() * 140;
    const lastActivityAt = new Date(Date.now() - lastActivityAgoHours * 3600000);
    const vendedor = vendedores[i % vendedores.length];
    const source = sources[i % sources.length];

    const prospect = await prisma.prospect.create({
      data: {
        name: names[i],
        phone: `999-${String(100 + i).padStart(3, "0")}-${String(1000 + i * 7).slice(-4)}`,
        email: `${names[i].toLowerCase().replace(/\s+/g, ".")}@example.com`,
        sourceType: source,
        assignedUserId: vendedor.id,
        projectId: project.id,
        unitInterest: i % 2 === 0 ? "2 recámaras" : "1 recámara",
        budget: 1800000 + (i % 6) * 250000,
        paymentMethod: i % 3 === 0 ? "Crédito bancario" : i % 3 === 1 ? "Contado" : "Infonavit",
        entryDate,
        stage,
        stageEnteredAt: entryDate,
        estimatedValue: 1800000 + (i % 6) * 250000,
        lossReason: stage === "PERDIDO" ? lossReasons[i % lossReasons.length] : null,
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

  const channels = ["Facebook Ads", "Google Ads", "Referidos", "Círculo Calume", "Instagram Ads"];
  for (let m = 0; m < 4; m++) {
    const date = new Date();
    date.setMonth(date.getMonth() - m, 5);
    for (const channel of channels) {
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

  console.log("Datos demostrativos creados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
