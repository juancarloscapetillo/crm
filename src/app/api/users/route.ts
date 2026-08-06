import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdminUser, handleApiError, jsonError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    if (user.role !== "ADMIN") {
      return NextResponse.json({ users: users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name, role: u.role })) });
    }
    return NextResponse.json({ users });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser();
    const body = await req.json();
    if (!body.name?.trim() || !body.email?.trim() || !body.password) {
      return jsonError("Nombre, correo y contraseña son obligatorios");
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email: body.email.toLowerCase().trim(),
        passwordHash,
        role: ["ADMIN", "LEAD_MANAGER", "COORDINADOR"].includes(body.role) ? body.role : "VENDEDOR",
      },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err: any) {
    if (err.code === "P2002") return jsonError("Ya existe un usuario con ese correo", 409);
    return handleApiError(err);
  }
}
