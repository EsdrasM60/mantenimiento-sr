"use client";
import useSWR from "swr";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon, CheckCircleIcon, PaperClipIcon } from "@heroicons/react/24/outline";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Programa = {
  _id: string;
  fichaId: any; // populated
  voluntarioId: any; // populated
  ayudanteId?: any; // populated
  asignadoFecha: string; // fecha objetivo
  completadoFecha?: string | null;
  notas?: string | null;
  fotos?: string[];
};

type Ficha = { _id?: string; id?: string; titulo: string; pdfId?: string | null };

function fmt(d?: string | null) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString(); } catch { return d || ""; }
}

function startOfCalendar(year: number, month: number) {
  // month: 0-11
  const first = new Date(year, month, 1);
  // Make Monday=0 .. Sunday=6
  const w = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - w);
  start.setHours(0, 0, 0, 0);
  return start;
}

export default function TareasCalendarioPage() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const y = cursor.getFullYear();
  const m = cursor.getMonth(); // 0-11

  // Traer datos del año actual del cursor y filtrar al mes en cliente
  const { data: programasResp } = useSWR<{ items: Programa[] }>(`/api/tareas/programa?page=1&pageSize=5000&year=${y}` , fetcher);
  const { data: fichasResp } = useSWR<{ items: Ficha[] }>(`/api/tareas/fichas?page=1&pageSize=10000&sort=alpha`, fetcher);

  const programasMes = useMemo(() => {
    const items = (programasResp?.items || []) as Programa[];
    return items.filter((p) => {
      const ref = p.asignadoFecha || p.completadoFecha;
      if (!ref) return false;
      const d = new Date(ref);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }, [programasResp, y, m]);

  const gridDays = useMemo(() => {
    const start = startOfCalendar(y, m);
    const days: { date: Date; inMonth: boolean; key: string }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const inMonth = d.getMonth() === m;
      const key = d.toISOString().slice(0, 10);
      days.push({ date: d, inMonth, key });
    }
    return days;
  }, [y, m]);

  const porDia = useMemo(() => {
    const map = new Map<string, Programa[]>();
    for (const p of programasMes) {
      const key = new Date(p.asignadoFecha || p.completadoFecha!).toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    // Ordenar por hora si existiese (no aplica); mantener como está
    return map;
  }, [programasMes]);

  const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const weekday = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];

  return (
    <section className="space-y-4">
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 text-sm">
            <Link href="/tareas" className="px-3 py-1 rounded border">Programa</Link>
            <Link href="/tareas/fichas" className="px-3 py-1 rounded border">Fichas</Link>
            <span className="px-3 py-1 rounded border bg-neutral-100">Calendario</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="border rounded p-1" onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))} aria-label="Mes anterior"><ChevronLeftIcon className="w-5 h-5"/></button>
            <button className="border rounded px-3 py-1 inline-flex items-center gap-2" onClick={() => setCursor(new Date())} title="Mes actual">
              <CalendarIcon className="w-5 h-5" />
              <span className="font-medium">{monthNames[m]} {y}</span>
            </button>
            <button className="border rounded p-1" onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))} aria-label="Mes siguiente"><ChevronRightIcon className="w-5 h-5"/></button>
          </div>
        </div>
      </div>

      <h1 className="text-2xl font-bold">Calendario de fichas</h1>

      <div className="grid grid-cols-7 text-xs font-medium text-neutral-600">
        {weekday.map((d) => (
          <div key={d} className="px-2 py-2">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-neutral-300 rounded overflow-hidden">
        {gridDays.map(({ date, inMonth, key }) => {
          const items = porDia.get(key) || [];
          const day = date.getDate();
          return (
            <div key={key} className={`min-h-32 bg-white ${inMonth ? "" : "bg-neutral-50 text-neutral-400"}`}>
              <div className="px-2 py-1 text-[11px] text-neutral-500">{day}</div>
              <div className="px-2 pb-2 space-y-1">
                {items.length === 0 ? (
                  <div className="text-[11px] text-neutral-400">—</div>
                ) : (
                  items.map((p) => {
                    const isDone = !!p.completadoFecha;
                    const hasAdj = !!p.fichaId?.pdfId;
                    return (
                      <div key={p._id} className={`border rounded px-2 py-1 text-[12px] ${isDone ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                        <div className="font-semibold truncate" title={p.fichaId?.titulo || "Ficha"}>{p.fichaId?.titulo || "Ficha"}</div>
                        <div className="truncate text-neutral-700">
                          {p.voluntarioId ? `${p.voluntarioId?.nombre} ${p.voluntarioId?.apellido}` : "(sin voluntario)"}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {hasAdj ? (
                            <a href={`/api/tareas/fichas/file/${p.fichaId.pdfId}`} target="_blank" rel="noreferrer" title="Ver adjunto" className="inline-flex items-center gap-1 text-xs text-blue-700 underline">
                              <PaperClipIcon className="w-3 h-3"/> adjunto
                            </a>
                          ) : null}
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-green-700"><CheckCircleIcon className="w-3 h-3"/> completo</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">pendiente</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
