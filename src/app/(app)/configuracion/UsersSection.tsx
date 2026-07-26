"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useFetch } from "@/lib/hooks";
import { Modal, ConfirmDialog } from "@/components/ui";
import { roleLabels, formatDate } from "@/lib/labels";

const emptyForm = { name: "", email: "", password: "", role: "VENDEDOR" };
const emptyEditForm = { name: "", email: "", password: "", role: "VENDEDOR" };

export default function UsersSection() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;
  const { data, reload } = useFetch<{ users: any[] }>("/api/users");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editSaving, setEditSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error);
      return;
    }
    toast.success("Usuario creado");
    setForm(emptyForm);
    setShowCreate(false);
    reload();
  }

  function openEdit(u: any) {
    setEditingUser(u);
    setEditForm({ name: u.name, email: u.email, password: "", role: u.role });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);
    const body: any = { name: editForm.name, email: editForm.email, role: editForm.role };
    if (editForm.password) body.password = editForm.password;
    const res = await fetch(`/api/users/${editingUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setEditSaving(false);
    if (!res.ok) {
      toast.error((await res.json()).error || "No se pudo actualizar el usuario");
      return;
    }
    toast.success("Usuario actualizado");
    setEditingUser(null);
    reload();
  }

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (res.ok) {
      toast.success(active ? "Usuario activado" : "Usuario desactivado");
      reload();
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    const res = await fetch(`/api/users/${toDelete}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Usuario eliminado");
      reload();
    } else {
      toast.error((await res.json()).error || "No se pudo eliminar el usuario");
    }
    setToDelete(null);
  }

  return (
    <div className="card p-4 max-w-3xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Usuarios y permisos</h3>
        <button className="btn-gold text-xs" onClick={() => setShowCreate(true)}>
          <Plus size={14} /> Nuevo usuario
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="text-left px-3 py-2">Nombre</th>
            <th className="text-left px-3 py-2">Correo</th>
            <th className="text-left px-3 py-2">Rol</th>
            <th className="text-left px-3 py-2">Alta</th>
            <th className="text-center px-3 py-2">Estatus</th>
            <th className="text-center px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(data?.users || []).map((u) => (
            <tr key={u.id}>
              <td className="px-3 py-2">{u.name}</td>
              <td className="px-3 py-2 text-gray-500">{u.email}</td>
              <td className="px-3 py-2">{roleLabels[u.role as keyof typeof roleLabels]}</td>
              <td className="px-3 py-2 text-gray-500">{formatDate(u.createdAt)}</td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => toggleActive(u.id, !u.active)}
                  className={`badge ${u.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {u.active ? "Activo" : "Inactivo"}
                </button>
              </td>
              <td className="px-3 py-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  <button onClick={() => openEdit(u)} className="text-gray-400 hover:text-calume-navy" title="Editar usuario">
                    <Pencil size={14} />
                  </button>
                  {u.id !== currentUserId && (
                    <button onClick={() => setToDelete(u.id)} className="text-gray-400 hover:text-red-500" title="Eliminar usuario">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar usuario"
        message="El usuario se elimina permanentemente. Sus prospectos, tareas y actividades pasadas se conservan sin asignar."
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo usuario">
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Correo *</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Contraseña *</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="VENDEDOR">Vendedor</option>
              <option value="LEAD_MANAGER">Lead Manager</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <button type="submit" disabled={saving} className="btn-gold w-full">
            {saving ? "Guardando..." : "Crear usuario"}
          </button>
        </form>
      </Modal>

      <Modal open={!!editingUser} onClose={() => setEditingUser(null)} title="Editar usuario">
        <form onSubmit={handleEdit} className="space-y-3">
          <div>
            <label className="label">Nombre *</label>
            <input className="input" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Correo *</label>
            <input
              type="email"
              className="input"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Nueva contraseña</label>
            <input
              type="password"
              className="input"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Dejar en blanco para no cambiarla"
            />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
              <option value="VENDEDOR">Vendedor</option>
              <option value="LEAD_MANAGER">Lead Manager</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <button type="submit" disabled={editSaving} className="btn-gold w-full">
            {editSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
