"use client";
import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PLAN_FICHAS, type PlanEntry, type Categoria } from "@/data/fichas-plan";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Programa = {
  _id: string;
  fichaId: any;
  voluntarioId: any;
  asignadoFecha: string;
  completadoFecha?: string | null;
};

type Ficha = { _id?: string; id?: string; titulo: string; };

const CATS: { key: Categoria; title: string; color: string }[] = [
  { key: "EDIFICIO", title: "1-EDIFICIO", color: "#ecb46c" },
  { key: "MECANICOS", title: "2-MECÁNICOS", color: "#84b6f4" },
  { key: "ELECTRICOS", title: "3-ELÉCTRICOS Y ELECTRÓNICOS", color: "#80d1c8" },
  { key: "EQUIPOS", title: "4-EQUIPOS Y HERRAMIENTAS", color: "#c8b4e3" },
];

const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function TareasCalendarioPage() {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [hidden, setHidden] = useState<Record<string, boolean>>({}); // key: titulo
  const { data: programasResp } = useSWR<{ items: Programa[] }>(`/api/tareas/programa?page=1&pageSize=10000&year=${year}` , fetcher);
  const { data: fichasResp } = useSWR<{ items: Ficha[] }>(`/api/tareas/fichas?page=1&pageSize=10000&sort=alpha`, fetcher);

  const programas = useMemo(() => (programasResp?.items || []) as Programa[], [programasResp]);
  const fichas = useMemo(() => (fichasResp?.items || []) as Ficha[], [fichasResp]);

  // Índice de programas por ficha y mes y asignados
  const progIndex = useMemo(() => {
    const map = new Map<string, { months: Set<number>; byMonth: Map<number, string[]> }>();
    for (const p of programas) {
      const fid = p.fichaId?._id || p.fichaId?.id || "";
      if (!fid) continue;
      const d = new Date(p.completadoFecha || p.asignadoFecha);
      if (isNaN(d as any) || d.getFullYear() !== year) continue;
      const m = d.getMonth() + 1; // 1..12
      const key = String(fid);
      if (!map.has(key)) map.set(key, { months: new Set(), byMonth: new Map() });
      const entry = map.get(key)!;
      entry.months.add(m);
      const idStr = p.voluntarioId?.shortId ? String(p.voluntarioId.shortId) : (p.voluntarioId?._id || p.voluntarioId?.id || "");
      const arr = entry.byMonth.get(m) || [];
      arr.push(idStr);
      entry.byMonth.set(m, arr);
    }
    return map;
  }, [programas, year]);

  function hasFicha(title: string): { id?: string } {
    const f = fichas.find((x) => (x.titulo || "").trim().toLowerCase() === title.trim().toLowerCase());
    return { id: (f?._id || (f as any)?.id) as string | undefined };
  }

  function Cell({ planned, done }: { planned: boolean; done: boolean }) {
    const bg = done ? "bg-green-400" : planned ? "bg-neutral-400" : "";
    return <td className={`h-6 min-w-8 border ${bg}`} />;
  }

  function Section({ cat }: { cat: typeof CATS[number] }) {
    const rows = PLAN_FICHAS.filter((e) => e.categoria === cat.key).filter((r) => !hidden[r.titulo]);
    return (
      <div className="border rounded overflow-hidden">
        <div className="px-3 py-2 text-white font-semibold flex items-center gap-3" style={{ backgroundColor: cat.color }}>
          <span>{cat.title}</span>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-neutral-100">
                <th className="text-left px-2 py-2 w-[220px]">Fichas</th>
                <th className="text-left px-2 py-2 w-[100px]">Frecuencia</th>
                {MESES.map((m) => (
                  <th key={m} className="px-1 py-2 text-center w-10">{m}</th>
                ))}
                <th className="text-left px-2 py-2 w-[200px]">Asignado(s)</th>
                <th className="w-[60px]"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const { id } = hasFicha(r.titulo);
                return (
                  <tr key={r.titulo} className="border-t">
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1">
                        <span>{r.titulo}{r.starred ? "*" : ""}</span>
                        {id ? (
                          <Link href={`/api/tareas/fichas/file/${id}`} className="text-blue-700 underline text-[11px] ml-2" target="_blank" rel="noreferrer">
                            ficha
                          </Link>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-2">{r.frecuencia}</td>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                      const planned = r.meses.includes(month);
                      const done = id ? (progIndex.get(String(id))?.months.has(month) ?? false) : false;
                      return <Cell key={month} planned={planned} done={done} />;
                    })}
                    <td className="px-2 py-2 text-[11px] text-neutral-700">
                      {id ? (
                        <div className="grid grid-cols-12 gap-1">
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                            const ids = progIndex.get(String(id))?.byMonth.get(month) || [];
                            return <div key={month} className="text-center">{ids.join(", ")}</div>;
                          })}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button className="text-xs underline" onClick={() => setHidden((h) => ({ ...h, [r.titulo]: true }))}>Ocultar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Panel para restaurar fichas ocultas
  const ocultas = Object.entries(hidden).filter(([, v]) => v).map(([k]) => k);

  return (
    <section className="space-y-6">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/tareas" className="px-3 py-1 rounded border">Programa</Link>
            <Link href="/tareas/fichas" className="px-3 py-1 rounded border">Fichas</Link>
            <span className="px-3 py-1 rounded border bg-neutral-100">Calendario</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="border rounded px-2 py-1" onClick={() => setYear((y) => y - 1)}>◀</button>
            <div className="font-medium">{year}</div>
            <button className="border rounded px-2 py-1" onClick={() => setYear((y) => y + 1)}>▶</button>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold">Calendario anual de fichas</h1>
      <p className="text-sm text-neutral-600">Gris: planificado · Verde: completado · Asignado(s): IDs por mes</p>

      {ocultas.length ? (
        <div className="border rounded p-2 text-sm">
          <div className="font-medium mb-1">Fichas ocultas</div>
          <div className="flex flex-wrap gap-2">
            {ocultas.map((t) => (
              <button key={t} className="border rounded px-2 py-1" onClick={() => setHidden((h) => ({ ...h, [t]: false }))}>{t} · mostrar</button>
            ))}
            <button className="ml-auto border rounded px-2 py-1" onClick={() => setHidden({})}>Mostrar todas</button>
          </div>
        </div>
      ) : null}

      {CATS.map((c) => (
        <Section key={c.key} cat={c} />
      ))}
    </section>
  );
}
