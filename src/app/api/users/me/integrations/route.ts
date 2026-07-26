import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, handleApiError, jsonError } from "@/lib/api";
import { encryptSecret } from "@/lib/crypto";
import { verifyTodoistToken } from "@/lib/todoist";

export async function GET() {
  try {
    const user = await requireUser();
    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { todoistApiTokenEnc: true } });
    return NextResponse.json({ todoistConnected: !!record?.todoistApiTokenEnc });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const token = body.todoistApiToken?.trim();
    if (!token) return jsonError("Ingresa tu token de Todoist");

    const valid = await verifyTodoistToken(token);
    if (!valid) return jsonError("El token de Todoist no es válido. Revísalo e intenta de nuevo.");

    await prisma.user.update({
      where: { id: user.id },
      data: { todoistApiTokenEnc: encryptSecret(token), todoistProjectId: null },
    });
    return NextResponse.json({ todoistConnected: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    await prisma.user.update({ where: { id: user.id }, data: { todoistApiTokenEnc: null, todoistProjectId: null } });
    return NextResponse.json({ todoistConnected: false });
  } catch (err) {
    return handleApiError(err);
  }
}
