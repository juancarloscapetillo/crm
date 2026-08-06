import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function getSessionUser() {
  const session = await getSession();
  if (!session?.user) return null;
  return session.user;
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new ApiAuthError("No autenticado", 401);
  return user;
}

export async function requireAdminUser() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ApiAuthError("No autorizado", 403);
  return user;
}

/** Admin and Coordinador see/edit every prospect, not just their own — everyone else is scoped to assignedUserId. */
export function canManageAllProspects(role: string) {
  return role === "ADMIN" || role === "COORDINADOR";
}

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiAuthError) {
    return jsonError(err.message, err.status);
  }
  console.error(err);
  return jsonError("Error interno del servidor", 500);
}
