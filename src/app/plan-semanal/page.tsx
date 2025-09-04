'use client';

import { useEffect, useMemo, useState } from 'react';
import { PLAN_SEMANAL } from '@/data/plan-semanal';

// Tipos mínimos para el documento
type Asignacion = {
	slot: number; // semana del mes 1..5
	plantilla?: number; // plantilla 1..5 (guía)
	congregacion?: string;
	year: number;
	month: number;
	completado: boolean;
	notas?: string;
	tareas?: string[]; // áreas elegidas
};

type PlanDoc = {
	year: number;
	month: number;
	congregaciones: string[];
	asignaciones: Asignacion[];
};

const MESES = [
	'Enero',
	'Febrero',
	'Marzo',
	'Abril',
	'Mayo',
	'Junio',
	'Julio',
	'Agosto',
	'Sptiembre',
	'Octubre',
	'Noviembre',
	'Diciembre',
];

export default function PlanSemanalPage() {
	const now = useMemo(() => new Date(), []);
	const [year, setYear] = useState<number>(now.getFullYear());
	const [month, setMonth] = useState<number>(now.getMonth() + 1); // 1..12
	const [doc, setDoc] = useState<PlanDoc | null>(null);
	const [loading, setLoading] = useState(false);
	const [savingCong, setSavingCong] = useState(false);
	const [newCong, setNewCong] = useState('');
	const [message, setMessage] = useState<string>('');

	useEffect(() => {
		let ignore = false;
		const load = async () => {
			setLoading(true);
			try {
				const res = await fetch(
					`/api/plan-semanal?year=${year}&month=${month}`,
					{ cache: 'no-store' }
				);
				const data = await res.json();
				if (!ignore) {
					if (res.ok && data.item) setDoc(data.item);
					else setDoc({ year, month, congregaciones: [], asignaciones: [] });
				}
			} catch (e) {
				if (!ignore) setDoc({ year, month, congregaciones: [], asignaciones: [] });
			} finally {
				if (!ignore) setLoading(false);
			}
		};
		load();
		return () => {
			ignore = true;
		};
	}, [year, month]);

	const asignacionPorSlot = useMemo(() => {
		const map = new Map<number, Asignacion>();
		doc?.asignaciones?.forEach((a: any) => {
			if (typeof a.slot === 'number') map.set(a.slot, a as Asignacion);
		});
		return map;
	}, [doc]);

	const defaultTareas = (plantilla?: number) => {
		if (!plantilla) return [] as string[];
		const tpl = PLAN_SEMANAL.find((p) => p.semana === plantilla);
		return (tpl?.tareas || []).map((t) => t.area);
	};

	const showMsg = (t: string) => {
		setMessage(t);
		setTimeout(() => setMessage(''), 2000);
	};

	const upsertSlot = async (slot: number, payload: Partial<Asignacion>) => {
		if (!doc) return;
		const existing = asignacionPorSlot.get(slot);
		if (existing) {
			const res = await fetch('/api/plan-semanal/asignar', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ year, month, slot, ...payload }),
			});
			const data = await res.json();
			setDoc(data.item);
			showMsg('Guardado');
		} else {
			const res = await fetch('/api/plan-semanal/asignar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ year, month, slot, ...payload }),
			});
			const data = await res.json();
			setDoc(data.item);
			showMsg('Asignado');
		}
	};

	const saveCongregaciones = async (list: string[]) => {
		setSavingCong(true);
		try {
			const res = await fetch('/api/plan-semanal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ year, month, congregaciones: list }),
			});
			const data = await res.json();
			setDoc(data.item);
			showMsg('Congregaciones guardadas');
		} finally {
			setSavingCong(false);
		}
	};

	const removeCong = (name: string) => {
		if (!doc) return;
		const next = doc.congregaciones.filter((c) => c !== name);
		saveCongregaciones(next);
	};

	const addCong = () => {
		const name = newCong.trim();
		if (!name || !doc) return;
		if (doc.congregaciones.includes(name)) {
			setNewCong('');
			return;
		}
		saveCongregaciones([...(doc.congregaciones || []), name]);
		setNewCong('');
	};

	const years = useMemo(() => {
		const y = now.getFullYear();
		return [y - 1, y, y + 1];
	}, [now]);

	return (
		<section className="space-y-6">
			<div className="flex items-center justify-between flex-wrap gap-4">
				<div>
					<h1 className="text-2xl font-bold">Plan semanal</h1>
					<p className="text-sm text-muted-foreground">Asignaciones por semana.</p>
				</div>
				<div className="flex items-center gap-2">
					<select
						className="border rounded px-2 py-1"
						value={year}
						onChange={(e) => setYear(parseInt(e.target.value))}
					>
						{years.map((y) => (
							<option key={y} value={y}>
								{y}
							</option>
						))}
					</select>
					<select
						className="border rounded px-2 py-1"
						value={month}
						onChange={(e) => setMonth(parseInt(e.target.value))}
					>
						{MESES.map((m, i) => (
							<option key={m} value={i + 1}>
								{m}
							</option>
						))}
					</select>
				</div>
			</div>

			{message && <div className="text-xs text-green-600">{message}</div>}

			<div className="space-y-2">
				<h2 className="font-medium">Congregaciones</h2>
				<div className="flex gap-2 flex-wrap items-center">
					<input
						className="border rounded px-2 py-1"
						placeholder="Nueva congregación"
						value={newCong}
						onChange={(e) => setNewCong(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') addCong();
						}}
					/>
					<button
						className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
						onClick={addCong}
						disabled={savingCong || !newCong.trim()}
					>
						Agregar
					</button>
					{savingCong && <span className="text-xs text-muted-foreground">Guardando…</span>}
				</div>
				<div className="flex gap-2 flex-wrap">
					{(doc?.congregaciones || []).map((c) => (
						<span key={c} className="inline-flex items-center gap-2 bg-gray-100 px-2 py-1 rounded">
							{c}
							<button
								className="text-red-600 hover:underline text-xs"
								onClick={() => removeCong(c)}
								title="Quitar"
							>
								×
							</button>
						</span>
					))}
					{doc && doc.congregaciones?.length === 0 && (
						<span className="text-xs text-muted-foreground">Aún no hay congregaciones</span>
					)}
				</div>
			</div>

			<div className="space-y-6">
				{[1, 2, 3, 4, 5].map((slot) => {
					const asign = asignacionPorSlot.get(slot);
					const plantilla = asign?.plantilla;
					const tpl = plantilla ? PLAN_SEMANAL.find((p) => p.semana === plantilla) : undefined;
					const tareasElegidas = asign?.tareas || [];
					const puedeCompletar = !!(plantilla && asign?.congregacion && (tareasElegidas?.length || 0) > 0);
					return (
						<div key={slot} className="border rounded-md p-4">
							<div className="flex items-center justify-between gap-3 flex-wrap">
								<div>
									<h3 className="font-semibold">Semana {slot} del mes</h3>
									{tpl ? (
										<p className="text-xs text-muted-foreground">Plantilla: {tpl.titulo}</p>
									) : (
										<p className="text-xs text-muted-foreground">
											Selecciona la semana de la guía para esta semana del mes
										</p>
									)}
								</div>
								<div className="flex items-center gap-3 flex-wrap">
									{/* 1) Elegir plantilla (semana de la guía 1..5) */}
									<select
										className="border rounded px-2 py-1"
										value={plantilla || ''}
										onChange={async (e) => {
											const p = parseInt(e.target.value);
											if (!p) return;
											// Al elegir plantilla, preseleccionar tareas por defecto
											await upsertSlot(slot, { plantilla: p, tareas: defaultTareas(p) });
										}}
									>
										<option value="">Semana de guía…</option>
										{PLAN_SEMANAL.map((p) => (
											<option key={p.semana} value={p.semana}>
												{p.titulo}
											</option>
										))}
									</select>

									{/* 2) Elegir congregación */}
									<select
										className="border rounded px-2 py-1 min-w-[220px] disabled:opacity-60"
										disabled={!plantilla}
										value={asign?.congregacion || ''}
										onChange={async (e) => {
											const v = e.target.value;
											if (!v) return;
											await upsertSlot(slot, { congregacion: v });
										}}
									>
										<option value="">Asignar congregación…</option>
										{(doc?.congregaciones || []).map((c) => (
											<option key={c} value={c}>
												{c}
											</option>
										))}
									</select>

									{/* 4) Completar */}
									<label className="inline-flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											checked={!!asign?.completado}
											disabled={!puedeCompletar}
											title={
												!puedeCompletar ? 'Selecciona plantilla, congregación y tareas' : 'Marcar completado'
											}
											onChange={async (e) => {
												await upsertSlot(slot, { completado: e.target.checked });
											}}
										/>
										Completado
									</label>
								</div>
							</div>

							{/* 3) Elegir tareas (áreas) */}
							{tpl && (
								<div className="mt-3 space-y-3">
									<div className="text-sm font-medium">Áreas a realizar</div>
									<div className="grid sm:grid-cols-2 gap-2 text-sm">
										{tpl.tareas.map((t) => {
											const checked = tareasElegidas.includes(t.area);
											return (
												<label
													key={t.area}
													className="flex items-start gap-2 bg-gray-50 rounded px-3 py-2"
												>
													<input
														type="checkbox"
														className="mt-1"
														disabled={!asign?.congregacion}
														checked={checked}
														onChange={async (e) => {
															const next = new Set(tareasElegidas);
															if (e.target.checked) next.add(t.area);
															else next.delete(t.area);
															await upsertSlot(slot, { tareas: Array.from(next) });
														}}
													/>
													<div>
														<div className="font-medium">{t.area}</div>
														<div className="text-xs text-muted-foreground leading-relaxed">
															{t.descripcion}
														</div>
													</div>
												</label>
											);
										})}
									</div>
								</div>
							)}
						</div>
					);
				})}
			</div>

			{loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
		</section>
	);
}
