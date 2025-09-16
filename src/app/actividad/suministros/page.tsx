"use client";
import { useState } from "react";

export default function SuministrosPage() {
  const [items, setItems] = useState<{ id: string; nombre: string; cantidad: number }[]>([]);
  const [nombre, setNombre] = useState("");
  const [cantidad, setCantidad] = useState<number>(1);

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre) return;
    setItems((s) => [...s, { id: String(Date.now()), nombre, cantidad }]);
    setNombre("");
    setCantidad(1);
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Lista de Suministros</h1>
      <form onSubmit={addItem} className="flex gap-2 items-end">
        <div>
          <label className="text-sm block mb-1">Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" />
        </div>
        <div>
          <label className="text-sm block mb-1">Cantidad</label>
          <input type="number" value={cantidad} onChange={(e) => setCantidad(parseInt(e.target.value || "1"))} className="input w-24" />
        </div>
        <div>
          <button className="btn btn-primary">Agregar</button>
        </div>
      </form>

      <div className="space-y-2">
        {items.length === 0 ? <div className="text-sm text-[color:var(--muted)]">No hay suministros.</div> : (
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.id} className="p-2 border rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{it.nombre}</div>
                  <div className="text-sm text-[color:var(--muted)]">Cantidad: {it.cantidad}</div>
                </div>
                <div>
                  <button className="btn btn-ghost" onClick={() => setItems((s) => s.filter((x) => x.id !== it.id))}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
