"use client";
import useSWR from "swr";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function VoluntariosPage() {
  const { data, mutate } = useSWR("/api/voluntarios", fetcher);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    congregacion: "",
    a2: false,
    trabajo_altura: false,
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/voluntarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ nombre: "", apellido: "", telefono: "", congregacion: "", a2: false, trabajo_altura: false });
      mutate();
    }
  }

  async function startEdit(v: any) {
    setEditing(v.id);
    setEditForm({
      nombre: v.nombre,
      apellido: v.apellido,
      telefono: v.telefono || "",
      congregacion: v.congregacion || "",
      a2: !!v.a2,
      trabajo_altura: !!v.trabajo_altura,
    });
  }

  async function saveEdit(id: string) {
    await fetch(`/api/voluntarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    setEditing(null);
    setEditForm({});
    mutate();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar voluntario?")) return;
    await fetch(`/api/voluntarios/${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Voluntarios</h1>

      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input className="w-full border rounded px-3 py-2" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Apellido</label>
          <input className="w-full border rounded px-3 py-2" value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Teléfono</label>
          <input className="w-full border rounded px-3 py-2" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Congregación</label>
          <input className="w-full border rounded px-3 py-2" value={form.congregacion} onChange={(e) => setForm({ ...form, congregacion: e.target.value })} />
        </div>
        <div className="sm:col-span-2 flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.a2} onChange={(e) => setForm({ ...form, a2: e.target.checked })} />
            A2 lleno
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.trabajo_altura} onChange={(e) => setForm({ ...form, trabajo_altura: e.target.checked })} />
            Trabajo en altura
          </label>
        </div>
        <div className="sm:col-span-2">
          <button className="px-4 py-2 rounded bg-foreground text-background">Guardar</button>
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Nombre</th>
              <th>Teléfono</th>
              <th>Congregación</th>
              <th>A2</th>
              <th>Altura</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((v: any) => (
              <tr key={v.id} className="border-b">
                <td className="py-2">
                  {editing === v.id ? (
                    <div className="grid sm:grid-cols-2 gap-2">
                      <input className="border rounded px-2 py-1" value={editForm.nombre || ""} onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })} />
                      <input className="border rounded px-2 py-1" value={editForm.apellido || ""} onChange={(e) => setEditForm({ ...editForm, apellido: e.target.value })} />
                    </div>
                  ) : (
                    <span>{v.nombre} {v.apellido}</span>
                  )}
                </td>
                <td>
                  {editing === v.id ? (
                    <input className="border rounded px-2 py-1" value={editForm.telefono || ""} onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })} />
                  ) : (
                    v.telefono || "—"
                  )}
                </td>
                <td>
                  {editing === v.id ? (
                    <input className="border rounded px-2 py-1" value={editForm.congregacion || ""} onChange={(e) => setEditForm({ ...editForm, congregacion: e.target.value })} />
                  ) : (
                    v.congregacion || "—"
                  )}
                </td>
                <td>
                  {editing === v.id ? (
                    <input type="checkbox" checked={!!editForm.a2} onChange={(e) => setEditForm({ ...editForm, a2: e.target.checked })} />
                  ) : (
                    v.a2 ? "Sí" : "No"
                  )}
                </td>
                <td>
                  {editing === v.id ? (
                    <input type="checkbox" checked={!!editForm.trabajo_altura} onChange={(e) => setEditForm({ ...editForm, trabajo_altura: e.target.checked })} />
                  ) : (
                    v.trabajo_altura ? "Sí" : "No"
                  )}
                </td>
                <td className="text-right whitespace-nowrap py-2">
                  {editing === v.id ? (
                    <>
                      <button className="px-2 py-1 mr-2 border rounded" onClick={() => saveEdit(v.id)}>Guardar</button>
                      <button className="px-2 py-1 border rounded" onClick={() => { setEditing(null); setEditForm({}); }}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button className="px-2 py-1 mr-2 border rounded" onClick={() => startEdit(v)}>Editar</button>
                      <button className="px-2 py-1 border rounded" onClick={() => del(v.id)}>Eliminar</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
