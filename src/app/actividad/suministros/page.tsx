"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

async function fetchItems() {
  const res = await fetch(`/api/actividad/suministros?page=1&pageSize=1000`);
  if (!res.ok) return [];
  const json = await res.json();
  return json.items || [];
}

export default function SuministrosPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [nombre, setNombre] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [idArticulo, setIdArticulo] = useState("");
  const [costo, setCosto] = useState<number | "">("");
  const [cantidadComprada, setCantidadComprada] = useState<number>(1);
  const [cantidadExistencia, setCantidadExistencia] = useState<number | "">("");
  const [fecha, setFecha] = useState<string>(new Date().toISOString().slice(0,10));
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchItems().then((it) => setItems(it)); }, []);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre) return;
    setLoading(true);
    const payload = {
      nombre,
      proveedor: proveedor || undefined,
      idArticulo: idArticulo || undefined,
      costo: costo === "" ? undefined : Number(costo),
      cantidadComprada: Number(cantidadComprada),
      cantidadExistencia: cantidadExistencia === "" ? undefined : Number(cantidadExistencia),
      fecha: fecha || undefined,
    };
    const res = await fetch(`/api/actividad/suministros`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    setLoading(false);
    if (!res.ok) return;
    const json = await res.json();
    setItems((s) => [json, ...s]);
    setNombre(""); setProveedor(""); setIdArticulo(""); setCosto(""); setCantidadComprada(1); setCantidadExistencia("");
  }

  async function removeItem(id: string) {
    const res = await fetch(`/api/actividad/suministros?id=${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setItems((s) => s.filter((x) => x._id !== id));
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" className="btn btn-ghost" onClick={() => router.back()} aria-label="Regresar">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold">Lista de Suministros</h1>
        <div />
      </div>

      <form onSubmit={addItem} className="grid gap-3 sm:grid-cols-3 items-end">
        <div>
          <label className="text-sm block mb-1">Nombre</label>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" required placeholder="Nombre del suministro" title="Nombre del suministro" />
        </div>

        <div>
          <label className="text-sm block mb-1">Proveedor</label>
          <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="input" placeholder="Proveedor (opcional)" title="Proveedor" />
        </div>

        <div>
          <label className="text-sm block mb-1">ID artículo (opcional)</label>
          <input value={idArticulo} onChange={(e) => setIdArticulo(e.target.value)} className="input" placeholder="ID del artículo (opcional)" title="ID del artículo" />
        </div>

        <div>
          <label className="text-sm block mb-1">Costo (RD$)</label>
          <input type="number" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value === "" ? "" : Number(e.target.value))} className="input" placeholder="Costo en RD$" title="Costo en RD$" />
        </div>

        <div>
          <label className="text-sm block mb-1">Cantidad comprada</label>
          <input type="number" min={1} value={cantidadComprada} onChange={(e) => setCantidadComprada(parseInt(e.target.value || "1"))} className="input w-36" placeholder="Cantidad comprada" title="Cantidad comprada" />
        </div>

        <div>
          <label className="text-sm block mb-1">Cantidad en existencia</label>
          <input type="number" min={0} value={cantidadExistencia} onChange={(e) => setCantidadExistencia(e.target.value === "" ? "" : Number(e.target.value))} className="input w-36" placeholder="Cantidad en existencia (por defecto = comprada)" title="Cantidad en existencia" />
        </div>

        <div>
          <label className="text-sm block mb-1">Fecha (movimiento)</label>
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input" title="Fecha del movimiento" />
        </div>

        <div className="sm:col-span-3">
          <button className="btn btn-primary" disabled={loading}>{loading?"Guardando...":"Agregar"}</button>
        </div>
      </form>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-[color:var(--muted)]">No hay suministros.</div>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it._id} className="p-3 border rounded">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-lg">{it.nombre} {it.idArticulo ? <span className="text-sm text-[color:var(--muted)]">· {it.idArticulo}</span> : null}</div>
                    <div className="text-sm text-[color:var(--muted)]">Proveedor: {it.proveedor || "-"} · {it.fecha ? new Date(it.fecha).toLocaleDateString() : "-"}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">RD$ {it.costo?.toFixed ? it.costo.toFixed(2) : (it.costo ?? "-")}</div>
                    <div className="text-sm text-[color:var(--muted)]">En existencia: {it.cantidadExistencia}</div>
                 </div>
               </div>
               <div className="mt-2 flex items-center justify-end">
                 <button className="btn btn-ghost" onClick={() => removeItem(it._id)}>Eliminar</button>
               </div>
             </li>
           ))}
         </ul>
       )}
     </div>
   </section>
 );
}
