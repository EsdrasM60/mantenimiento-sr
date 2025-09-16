"use client";
import { useState } from "react";

type Registro = { id: string; titulo: string; descripcion?: string; fecha: string };

export default function MantenimientoPage() {
  const [items, setItems] = useState<Registro[]>([]);
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!titulo) return;
    setItems((s) => [...s, { id: String(Date.now()), titulo, descripcion, fecha: new Date().toISOString() }]);
    setTitulo("");
    setDescripcion("");
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Registro de Mantenimiento y Reparaciones</h1>
      <form onSubmit={add} className="space-y-2">
        <div>
          <label className="text-sm block mb-1">Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="text-sm block mb-1">Descripción</label>
          <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="textarea w-full" />
        </div>
        <div>
          <button className="btn btn-primary">Agregar registro</button>
        </div>
      </form>

      <div className="space-y-2">
        {items.length === 0 ? <div className="text-sm text-[color:var(--muted)]">No hay registros.</div> : (
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.id} className="p-2 border rounded">
                <div className="font-medium">{it.titulo}</div>
                <div className="text-sm text-[color:var(--muted)]">{new Date(it.fecha).toLocaleString()}</div>
                {it.descripcion ? <div className="mt-1">{it.descripcion}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
