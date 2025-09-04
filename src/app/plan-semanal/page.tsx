'use client';

import { useEffect, useMemo, useState } from 'react';
import { PLAN_SEMANAL } from '@/data/plan-semanal';

async function fetchJSON<T = any>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, init);
	const ct = res.headers.get('content-type') || '';
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(text || `Error ${res.status}`);
	}
	if (!ct.includes('application/json')) {
		const text = await res.text().catch(() => '');
		throw new Error(text || 'Respuesta no JSON');
	}
	return res.json() as Promise<T>;
}

// Tipos mínimos para el documento
type Asignacion = {
	semana: number;
	congregacion: string;
	year: number;
	month: number;
	completado: boolean;
	notas?: string;
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
				const data = await fetchJSON<{ item: PlanDoc }>(
					`/api/plan-semanal?year=${year}&month=${month}`,
					{ cache: 'no-store' }
				);
				if (!ignore)
					setDoc(data.item || { year, month, congregaciones: [], asignaciones: [] });
			} catch (e: any) {
				if (!ignore) {
					setDoc({ year, month, congregaciones: [], asignaciones: [] });
					setMessage(e?.message || 'Error al cargar');
				}
			} finally {
				if (!ignore) setLoading(false);
			}
		};
		load();
		return () => {
			ignore = true;
		};
	}, [year, month]);

	const asignacionPorSemana = useMemo(() => {
		const map = new Map<number, Asignacion>();
		doc?.asignaciones?.forEach((a) => map.set(a.semana, a));
		return map;
	}, [doc]);

	const showMsg = (t: string) => {
		setMessage(t);
		setTimeout(() => setMessage(''), 2000);
	};

	const upsertAsignacion = async (semana: number, payload: Partial<Asignacion>) => {
		if (!doc) return;
		const existing = asignacionPorSemana.get(semana);
		try {
			if (existing) {
				const data = await fetchJSON<{ item: PlanDoc }>(
					'/api/plan-semanal/asignar',
					{
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ year, month, semana, ...payload }),
					}
				);
				setDoc(data.item);
				showMsg('Guardado');
			} else {
				if (!payload.congregacion) return; // requerido para crear
				const data = await fetchJSON<{ item: PlanDoc }>(
					'/api/plan-semanal/asignar',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ year, month, semana, congregacion: payload.congregacion }),
					}
				);
				setDoc(data.item);
				showMsg('Asignado');
			}
		} catch (e: any) {
			setMessage(e?.message || 'Error al guardar');
		}
	};

	const saveCongregaciones = async (list: string[]) => {
		setSavingCong(true);
		try {
			const data = await fetchJSON<{ item: PlanDoc }>(
				'/api/plan-semanal',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ year, month, congregaciones: list }),
				}
			);
			setDoc(data.item);
			showMsg('Congregaciones guardadas');
		} catch (e: any) {
			setMessage(e?.message || 'Error al guardar');
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
				{PLAN_SEMANAL.map((sem) => {
					const asign = asignacionPorSemana.get(sem.semana);
					const asignValue = asign?.congregacion || '';
					const completed = !!asign?.completado;
					return (
						<div key={sem.semana} className="border rounded-md p-4">
							<div className="flex items-center justify-between gap-3 flex-wrap">
								<div>
									<h3 className="font-semibold">{sem.titulo}</h3>
									{sem.subtitulo && (
										<p className="text-xs text-muted-foreground">{sem.subtitulo}</p>
									)}
								</div>
								<div className="flex items-center gap-3">
									{/* Selector de congregación desde BD */}
									<select
										className="border rounded px-2 py-1 min-w-[220px]"
										value={asignValue || ''}
										onChange={async (e) => {
											const v = e.target.value;
											if (!v) return;
											await upsertAsignacion(sem.semana, { congregacion: v });
										}}
									>
										<option value="">Selecciona congregación…</option>
										{(doc?.congregaciones || []).map((c) => (
											<option key={c} value={c}>
												{c}
											</option>
										))}
									</select>

									<label className="inline-flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											checked={completed}
											disabled={!asign || !asign.congregacion}
											title={
												!asign || !asign.congregacion
													? 'Asigna una congregación para habilitar'
													: 'Marcar completado'
											}
											onChange={async (e) => {
												if (!asign) return; // requiere asignación primero
												await upsertAsignacion(sem.semana, { completado: e.target.checked });
											}}
										/>
										Completado
									</label>
								</div>
							</div>

							{sem.tareas.length > 0 && (
								<ul className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
									{sem.tareas.map((t, idx) => (
										<li key={idx} className="bg-gray-50 rounded px-3 py-2">
											<div className="font-medium">{t.area}</div>
											<div className="text-xs text-muted-foreground leading-relaxed">
												{t.descripcion}
											</div>
										</li>
									))}
								</ul>
							)}
						</div>
					);
				})}
			</div>

			{loading && <p className="text-sm text-muted-foreground">Cargando…</p>}
		</section>
	);
}
