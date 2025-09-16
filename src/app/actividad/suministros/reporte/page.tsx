"use client";
import { useState } from "react";

export default function ReporteSuministros() {
  const [from, setFrom] = useState<string>(new Date(new Date().setDate(new Date().getDate()-30)).toISOString().slice(0,10));
  const [to, setTo] = useState<string>(new Date().toISOString().slice(0,10));
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function runReport(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/actividad/suministros?${params.toString()}`);
    setLoading(false);
    if (!res.ok) return setItems([]);
    const json = await res.json();
    setItems(json.items || []);
  }

  function exportCsv() {
    if (!items) return;
    const header = ["fecha","nombre","idArticulo","proveedor","costo","cantidadComprada","cantidadExistencia"];
    const rows = items.map((it) => [
      it.fecha ? new Date(it.fecha).toISOString() : "",
      (it.nombre || "").replace(/\"/g, '"'),
      it.idArticulo || "",
      it.proveedor || "",
      typeof it.costo === 'number' ? it.costo.toFixed(2) : "",
      it.cantidadComprada ?? "",
      it.cantidadExistencia ?? "",
    ]);
    const csv = [header.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `suministros_${from || 'start'}_${to || 'end'}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Reporte de Suministros</h1>
      <form onSubmit={runReport} className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-sm mb-1">Desde</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
        </div>
        <div>
          <label className="block text-sm mb-1">Hasta</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
        </div>
        <div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Generando...' : 'Generar'}</button>
        </div>
        {items && (
          <div>
            <button type="button" className="btn" onClick={exportCsv}>Exportar CSV</button>
          </div>
        )}
      </form>

      <div>
        {!items ? (
          <div className="text-sm text-[color:var(--muted)]">Ejecuta el reporte para ver movimientos.</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-[color:var(--muted)]">No hay movimientos en el rango seleccionado.</div>
        ) : (
          <div className="overflow-auto border rounded">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-[color:var(--surface-2)]">
                <tr>
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Nombre</th>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Proveedor</th>
                  <th className="p-2 text-right">Costo</th>
                  <th className="p-2 text-right">Comprada</th>
                  <th className="p-2 text-right">Existencia</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it._id} className="border-t">
                    <td className="p-2">{it.fecha ? new Date(it.fecha).toLocaleString() : ''}</td>
                    <td className="p-2">{it.nombre}</td>
                    <td className="p-2">{it.idArticulo || ''}</td>
                    <td className="p-2">{it.proveedor || ''}</td>
                    <td className="p-2 text-right">{typeof it.costo === 'number' ? it.costo.toFixed(2) : ''}</td>
                    <td className="p-2 text-right">{it.cantidadComprada}</td>
                    <td className="p-2 text-right">{it.cantidadExistencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
