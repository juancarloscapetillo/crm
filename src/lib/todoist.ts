import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";

const API = "https://api.todoist.com/rest/v2";
const PROJECT_NAME = "Calume CRM";

export async function verifyTodoistToken(token: string): Promise<boolean> {
  const res = await fetch(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
  return res.ok;
}

async function getOrCreateProject(token: string, userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { todoistProjectId: true } });
  if (user?.todoistProjectId) return user.todoistProjectId;

  const listRes = await fetch(`${API}/projects`, { headers: { Authorization: `Bearer ${token}` } });
  if (!listRes.ok) return null;
  const projects: { id: string; name: string }[] = await listRes.json();
  let project = projects.find((p) => p.name === PROJECT_NAME);

  if (!project) {
    const createRes = await fetch(`${API}/projects`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: PROJECT_NAME }),
    });
    if (!createRes.ok) return null;
    project = await createRes.json();
  }

  await prisma.user.update({ where: { id: userId }, data: { todoistProjectId: project!.id } });
  return project!.id;
}

/** Best-effort push: never throws. Returns the Todoist task id if it was created there. */
export async function pushTaskToTodoist(userId: string, content: string, dueDate: Date | null): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { todoistApiTokenEnc: true } });
    if (!user?.todoistApiTokenEnc) return null;
    const token = decryptSecret(user.todoistApiTokenEnc);

    const projectId = await getOrCreateProject(token, userId);
    if (!projectId) return null;

    const res = await fetch(`${API}/tasks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        project_id: projectId,
        due_date: dueDate ? dueDate.toISOString().slice(0, 10) : undefined,
      }),
    });
    if (!res.ok) return null;
    const created = await res.json();
    return created.id as string;
  } catch (err) {
    console.error("Todoist push failed:", err);
    return null;
  }
}

/** Best-effort update: never throws. */
export async function updateTodoistTask(userId: string, todoistTaskId: string, content: string, dueDate: Date | null): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { todoistApiTokenEnc: true } });
    if (!user?.todoistApiTokenEnc) return;
    const token = decryptSecret(user.todoistApiTokenEnc);

    await fetch(`${API}/tasks/${todoistTaskId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content, due_date: dueDate ? dueDate.toISOString().slice(0, 10) : undefined }),
    });
  } catch (err) {
    console.error("Todoist update failed:", err);
  }
}

/** Best-effort close/reopen/delete: never throw. */
export async function setTodoistTaskCompleted(userId: string, todoistTaskId: string, completed: boolean): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { todoistApiTokenEnc: true } });
    if (!user?.todoistApiTokenEnc) return;
    const token = decryptSecret(user.todoistApiTokenEnc);
    await fetch(`${API}/tasks/${todoistTaskId}/${completed ? "close" : "reopen"}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    console.error("Todoist complete/reopen failed:", err);
  }
}

export async function deleteTodoistTask(userId: string, todoistTaskId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { todoistApiTokenEnc: true } });
    if (!user?.todoistApiTokenEnc) return;
    const token = decryptSecret(user.todoistApiTokenEnc);
    await fetch(`${API}/tasks/${todoistTaskId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    console.error("Todoist delete failed:", err);
  }
}
