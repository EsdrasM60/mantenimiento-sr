"use client";
import { useState } from "react";

export default function SuministrosPage() {
  const [items, setItems] = useState<{
    id: string;
    nombre: string;
    proveedor?: string;
    idArticulo?: string;
    costo?: number;
    cantidadComprada: number;
    cantidadExistencia: number;
  }[]>([]);

  const [nombre, setNombre] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [idArticulo, setIdArticulo] = useState("");
  const [costo, setCosto] = useState<number | "">("");
  const [cantidadComprada, setCantidadComprada] = useState<number>(1);
  const [cantidadExistencia, setCantidadExistencia] = useState<number | "">("");

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre) return;
    const costoNum = costo === "" ? undefined : Number(costo);
    const existencia = cantidadExistencia === "" ? cantidadComprada : Number(cantidadExistencia);
    setItems((s) => [
      ...s,
      {
        id: String(Date.now()),
        nombre,
        proveedor: proveedor || undefined,
        idArticulo: idArticulo || undefined,
        costo: costoNum,
        cantidadComprada: Number(cantidadComprada),
        cantidadExistencia: Number(existencia),
      },
    ]);
    setNombre("");
    setProveedor("");
    setIdArticulo("");
    setCosto("");
    setCantidadComprada(1);
    setCantidadExistencia("");
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Lista de Suministros</h1>
      <form onSubmit={addItem} className="grid gap-3 sm:grid-cols-3 items-end">
        <div>
          <label className="text-sm block mb-1">Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" required />
        </div>

        <div>
          <label className="text-sm block mb-1">Proveedor</label>
          <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="input" />
        </div>

        <div>
          <label className="text-sm block mb-1">ID artículo (opcional)</label>
          <input value={idArticulo} onChange={(e) => setIdArticulo(e.target.value)} className="input" />
        </div>

        <div>
          <label className="text-sm block mb-1">Costo (RD$)</label>
          <input type="number" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value === "" ? "" : Number(e.target.value))} className="input" />
        </div>

        <div>
          <label className="text-sm block mb-1">Cantidad comprada</label>
          <input type="number" min={1} value={cantidadComprada} onChange={(e) => setCantidadComprada(parseInt(e.target.value || "1"))} className="input w-36" />
        </div>

        <div>
          <label className="text-sm block mb-1">Cantidad en existencia</label>
          <input type="number" min={0} value={cantidadExistencia} onChange={(e) => setCantidadExistencia(e.target.value === "" ? "" : Number(e.target.value))} className="input w-36" placeholder="(por defecto = comprada)" />
        </div>

        <div className="sm:col-span-3">
          <button className="btn btn-primary">Agregar</button>
        </div>
      </form>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-[color:var(--muted)]">No hay suministros.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="p-3 border rounded">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-lg">{it.nombre} {it.idArticulo ? <span className="text-sm text-[color:var(--muted)]">· {it.idArticulo}</span> : null}</div>
                    <div className="text-sm text-[color:var(--muted)]">Proveedor: {it.proveedor || "-"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">RD$ {it.costo?.toFixed ? it.costo.toFixed(2) : (it.costo ?? "-")}</div>
                    <div className="text-sm text-[color:var(--muted)]">En existencia: {it.cantidadExistencia}</div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-end">
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
