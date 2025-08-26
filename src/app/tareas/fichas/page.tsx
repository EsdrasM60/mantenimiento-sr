"use client";
import useSWR from "swr";
import React from "react";
import { useMemo, useRef, useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ChecklistItem = { text: string; done?: boolean };

type Ficha = {
  id: string;
  titulo: string;
  descripcion?: string | null;
  prioridad: "BAJA" | "MEDIA" | "ALTA";
  estado: "ABIERTA" | "EN_PROGRESO" | "COMPLETADA";
  asignado_a?: string | null;
  vencimiento?: string | null;
  createdAt?: string;
  pdfId?: string | null;
  instrucciones?: string | null;
  notas?: string | null;
  checklist?: ChecklistItem[];
};

type ApiResp = { items: Ficha[]; total: number; page: number; pageSize: number };



function RichTextEditor({ value, onChange, onAttach }: { value: string; onChange: (html: string)=>void; onAttach?: (id: string, url: string, name: string)=>void }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const imgInput = React.useRef<HTMLInputElement | null>(null);
  const fileInput = React.useRef<HTMLInputElement | null>(null);
  function exec(command: string) {
    document.execCommand(command, false);
    if (ref.current) onChange(ref.current.innerHTML);
  }
  function onInput() { if (ref.current) onChange(ref.current.innerHTML); }
  function insertHtml(html: string) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { if (ref.current) { ref.current.insertAdjacentHTML('beforeend', html); } return; }
    const range = sel.getRangeAt(0);
    const el = document.createElement('div');
    el.innerHTML = html;
    const frag = document.createDocumentFragment();
    while (el.firstChild) frag.appendChild(el.firstChild);
    range.deleteContents();
    range.insertNode(frag);
    if (ref.current) onChange(ref.current.innerHTML);
  }
  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const j = await res.json();
      if (j?.id) {
        const url = `/api/images/${j.id}`;
        insertHtml(`<img src="${url}" alt="" style="max-width:100%; height:auto;" />`);
      }
    } finally {
      if (imgInput.current) imgInput.current.value = '';
    }
  }
  async function handleAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/tareas/fichas/pdf', { method: 'POST', body: fd });
      const j = await res.json();
      if (j?.id) {
        const url = `/api/tareas/fichas/file/${j.id}`;
        const name = (file as any).name || 'archivo';
        insertHtml(`<a href="${url}" target="_blank" rel="noreferrer">${name}</a>`);
        onAttach && onAttach(String(j.id), url, name);
      }
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }
  return (
    <div className="border rounded">
      <div className="flex items-center gap-2 px-2 py-1 text-sm bg-neutral-100 border-b">
        <button type="button" className="font-bold" onClick={()=>exec('bold')}>B</button>
        <button type="button" className="italic" onClick={()=>exec('italic')}>I</button>
        <button type="button" className="underline" onClick={()=>exec('underline')}>U</button>
        <span className="mx-1 h-5 w-px bg-neutral-300" />
        <button type="button" onClick={()=>exec('insertUnorderedList')}>• Lista</button>
        <button type="button" onClick={()=>exec('insertOrderedList')}>1. Lista</button>
        <span className="mx-1 h-5 w-px bg-neutral-300" />
        <button type="button" title="Insertar imagen" onClick={()=>imgInput.current?.click()}>🖼️</button>
        <input ref={imgInput} type="file" accept="image/*" className="hidden" onChange={handleImage} />
        <button type="button" title="Adjuntar archivo (PDF/DOCX)" onClick={()=>fileInput.current?.click()}>📎</button>
        <input ref={fileInput} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={handleAttach} />
      </div>
      <div ref={ref} className="min-h-[160px] p-3 outline-none" contentEditable onInput={onInput} dangerouslySetInnerHTML={{ __html: value || '' }} />
    </div>
  );
}

export default function FichasPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sort, setSort] = useState<'alpha'|'recent'>('alpha');
  const { data, mutate, isLoading } = useSWR<ApiResp>(`/api/tareas/fichas?page=${page}&pageSize=${pageSize}&sort=${sort}` , fetcher);

  // Filtros (cliente)
  const [q, setQ] = useState("");
  const [fPrioridad, setFPrioridad] = useState<"ALL" | Ficha["prioridad"]>("ALL");
  const [fEstado, setFEstado] = useState<"ALL" | Ficha["estado"]>("ALL");

  const filtered = useMemo(() => {
    let rows = data?.items ?? [];
    if (q.trim()) {
      const s = q.toLowerCase();
      rows = rows.filter((r) =>
        (r.titulo || "").toLowerCase().includes(s) || (r.descripcion || "").toLowerCase().includes(s) || (r.asignado_a || "").toLowerCase().includes(s)
      );
    }
    if (fPrioridad !== "ALL") rows = rows.filter((r) => r.prioridad === fPrioridad);
    if (fEstado !== "ALL") rows = rows.filter((r) => r.estado === fEstado);
      // Orden segun selector
    if (sort === 'alpha') {
      rows = rows.slice().sort((a,b)=> (a.titulo||'').localeCompare(b.titulo||'', 'es', {sensitivity:'base'}));
    } else {
      rows = rows.slice().sort((a,b)=> new Date(b.createdAt||0).getTime() - new Date(a.createdAt||0).getTime());
    }
    return rows;
  }, [data, q, fPrioridad, fEstado, sort]);

  // Crear
  const [form, setForm] = useState({ titulo: "", descripcion: "", prioridad: "MEDIA", asignado_a: "", vencimiento: "", instrucciones: "", notas: "" } as any);
  const [checklistForm, setChecklistForm] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState("");
  const [saving, setSaving] = useState(false);
  const [createPdfId, setCreatePdfId] = useState<string | null>(null);
  const [createPdfName, setCreatePdfName] = useState<string | null>(null);
  const [rtContent, setRtContent] = useState("");

  async function createFicha(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/tareas/fichas", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        titulo: form.titulo,
        descripcion: form.descripcion || null,
        prioridad: form.prioridad,
        asignado_a: form.asignado_a || null,
        vencimiento: form.vencimiento || null,
        instrucciones: rtContent || null,
        notas: form.notas || null,
        checklist: checklistForm,
        ...(createPdfId ? { pdfId: createPdfId } : {}),
      }),
    });
    setSaving(false);
    setForm({ titulo: "", descripcion: "", prioridad: "MEDIA", asignado_a: "", vencimiento: "", instrucciones: "", notas: "" });
    setChecklistForm([]);
    setRtContent("");
    setCreatePdfId(null);
    setCreatePdfName(null);
    setNewItem("");
    mutate();
    setCreateOpen(false);
  }

  function addChecklistItem() {
    if (!newItem.trim()) return;
    setChecklistForm((prev) => [...prev, { text: newItem.trim(), done: false }]);
    setNewItem("");
  }

  function removeChecklistItem(idx: number) {
    setChecklistForm((prev) => prev.filter((_, i) => i !== idx));
  }

  function toggleChecklistItem(idx: number) {
    setChecklistForm((prev) => prev.map((it, i) => (i === idx ? { ...it, done: !it.done } : it)));
  }

  function moveChecklistItem(idx: number, dir: -1 | 1) {
    setChecklistForm((prev) => {
      const next = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= next.length) return prev;
      const [item] = next.splice(idx, 1);
      next.splice(newIdx, 0, item);
      return next;
    });
  }

  // Crear desde archivo (PDF/DOC)
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState<"form" | "file">("form");

  async function createFromFile(e: React.FormEvent) {
    e.preventDefault();
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    const up = await fetch("/api/tareas/fichas/pdf", { method: "POST", body: fd });
    const uj = await up.json();
    if (uj?.id) {
      await fetch("/api/tareas/fichas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo: f.name.replace(/\.(pdf|doc)$/i, ""), pdfId: uj.id }),
      });
      mutate();
      if (fileRef.current) fileRef.current.value = "";
      setCreateOpen(false);
    }
    setUploading(false);
  }

  // Edición inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editChecklist, setEditChecklist] = useState<ChecklistItem[]>([]);
  const [editNewItem, setEditNewItem] = useState("");
  const editFileRef = useRef<HTMLInputElement | null>(null);

  function startEdit(f: Ficha) {
    setEditId(f.id);
    setEditForm({
      titulo: f.titulo,
      descripcion: f.descripcion || "",
      prioridad: f.prioridad,
      estado: f.estado,
      asignado_a: f.asignado_a || "",
      vencimiento: f.vencimiento ? f.vencimiento.substring(0, 10) : "",
      instrucciones: f.instrucciones || "",
      notas: f.notas || "",
    });
    setEditChecklist(Array.isArray(f.checklist) ? f.checklist : []);
  }

  async function saveEdit(id: string) {
    let nextPdfId = editForm.pdfId ?? undefined;
    const file = editFileRef.current?.files?.[0];
    if (file) {
      const fd = new FormData();
      fd.append("file", file);
      const up = await fetch("/api/tareas/fichas/pdf", { method: "POST", body: fd });
      const uj = await up.json();
      if (uj?.id) nextPdfId = uj.id;
    }

    await fetch(`/api/tareas/fichas/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...editForm,
        descripcion: editForm.descripcion || null,
        asignado_a: editForm.asignado_a || null,
        vencimiento: editForm.vencimiento || null,
        instrucciones: editForm.instrucciones || null,
        notas: editForm.notas || null,
        checklist: editChecklist,
        ...(nextPdfId !== undefined ? { pdfId: nextPdfId } : {}),
      }),
    });
    if (editFileRef.current) editFileRef.current.value = "";
    setEditId(null);
    mutate();
  }

  function addEditChecklistItem() {
    if (!editNewItem.trim()) return;
    setEditChecklist((prev) => [...prev, { text: editNewItem.trim(), done: false }]);
    setEditNewItem("");
  }
  function removeEditChecklistItem(idx: number) {
    setEditChecklist((prev) => prev.filter((_, i) => i !== idx));
  }
  function toggleEditChecklistItem(idx: number) {
    setEditChecklist((prev) => prev.map((it, i) => (i === idx ? { ...it, done: !it.done } : it)));
  }

  function moveEditChecklistItem(idx: number, dir: -1 | 1) {
    setEditChecklist((prev) => {
      const next = [...prev];
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= next.length) return prev;
      const [item] = next.splice(idx, 1);
      next.splice(newIdx, 0, item);
      return next;
    });
  }

  async function deleteFicha(id: string) {
    await fetch(`/api/tareas/fichas/${id}`, { method: "DELETE" });
    mutate();
  }

  const total = data?.total ?? 0;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));

  // Nuevo modal de vista con pestañas (Vista / Archivo)
  const [previewFicha, setPreviewFicha] = useState<Ficha | null>(null);
  const [previewTab, setPreviewTab] = useState<"vista" | "archivo">("vista");
  const fileUrl = previewFicha?.pdfId ? `/api/tareas/fichas/file/${previewFicha.pdfId}` : null;

  function openPreview(f: Ficha) {
    setPreviewFicha(f);
    setPreviewTab("vista");
  }
  function closePreview() {
    setPreviewFicha(null);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Fichas</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <input className="border rounded px-2 py-1" placeholder="Buscar" value={q} onChange={(e)=>setQ(e.target.value)} />
          <select className="border rounded px-2 py-1" value={fPrioridad} onChange={(e)=>setFPrioridad(e.target.value as any)}>
            <option value="ALL">Todas las prioridades</option>
            <option value="BAJA">Baja</option>
            <option value="MEDIA">Media</option>
            <option value="ALTA">Alta</option>
          </select>
          <select className="border rounded px-2 py-1" value={fEstado} onChange={(e)=>setFEstado(e.target.value as any)}>
            <option value="ALL">Todos los estados</option>
            <option value="ABIERTA">Abierta</option>
            <option value="EN_PROGRESO">En progreso</option>
            <option value="COMPLETADA">Completada</option>
          </select>
          <select className="border rounded px-2 py-1" value={sort} onChange={(e)=>setSort(e.target.value as any)}>
            <option value="alpha">Orden alfabético</option>
            <option value="recent">Más recientes</option>
          </select>
          <button className="px-3 py-1 bg-foreground text-background rounded" onClick={()=>{ setCreateTab("form"); setCreateOpen(true); }}>Nueva Ficha</button>
          <button className="px-3 py-1 border rounded" onClick={()=>{ setCreateTab("file"); setCreateOpen(true); }}>Nueva desde archivo</button>
        </div>
      </div>

      {/* Se elimina el formulario inline y la creación desde archivo; ahora viven en el modal */}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <>
          <ul className="grid gap-3">
            {filtered?.map((f) => (
              <li key={f.id} className="border rounded p-3 flex flex-col gap-3">
                {editId === f.id ? (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className="border rounded px-2 py-1" value={editForm.titulo || ""} onChange={(e)=>setEditForm({ ...editForm, titulo: e.target.value })} />
                      <select className="border rounded px-2 py-1" value={editForm.prioridad || "MEDIA"} onChange={(e)=>setEditForm({ ...editForm, prioridad: e.target.value })}>
                        <option value="BAJA">Baja</option>
                        <option value="MEDIA">Media</option>
                        <option value="ALTA">Alta</option>
                      </select>
                      <input className="border rounded px-2 py-1 sm:col-span-2" placeholder="Descripción" value={editForm.descripcion || ""} onChange={(e)=>setEditForm({ ...editForm, descripcion: e.target.value })} />
                      <select className="border rounded px-2 py-1" value={editForm.estado || "ABIERTA"} onChange={(e)=>setEditForm({ ...editForm, estado: e.target.value })}>
                        <option value="ABIERTA">Abierta</option>
                        <option value="EN_PROGRESO">En progreso</option>
                        <option value="COMPLETADA">Completada</option>
                      </select>
                      <input className="border rounded px-2 py-1" placeholder="Asignado a" value={editForm.asignado_a || ""} onChange={(e)=>setEditForm({ ...editForm, asignado_a: e.target.value })} />
                      <input className="border rounded px-2 py-1" type="date" value={editForm.vencimiento || ""} onChange={(e)=>setEditForm({ ...editForm, vencimiento: e.target.value })} />
                    </div>
                    <textarea className="border rounded px-2 py-1" rows={3} placeholder="Instrucciones" value={editForm.instrucciones || ""} onChange={(e)=>setEditForm({ ...editForm, instrucciones: e.target.value })} />
                    <div className="border rounded p-2">
                      <div className="font-medium mb-2">Archivo de ficha</div>
                      <div className="flex items-center gap-2">
                        {editForm.pdfId ? (
                          <a className="text-blue-700 underline text-sm" href={`/api/tareas/fichas/file/${editForm.pdfId}`} target="_blank" rel="noreferrer">Ver actual</a>
                        ) : (
                          <span className="text-xs text-neutral-500">Sin archivo</span>
                        )}
                        <input ref={editFileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                      </div>
                    </div>
                    <div className="border rounded p-2">
                      <div className="font-medium mb-2">Checklist</div>
                      <div className="flex gap-2 mb-2">
                        <input className="border rounded px-2 py-1 flex-1" placeholder="Nuevo ítem" value={editNewItem} onChange={(e)=>setEditNewItem(e.target.value)} />
                        <button type="button" className="px-3 py-1 border rounded" onClick={addEditChecklistItem}>Agregar</button>
                      </div>
                      <ul className="space-y-1">
                        {editChecklist.map((it, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <input type="checkbox" checked={!!it.done} onChange={()=>toggleEditChecklistItem(idx)} />
                            <span className={it.done?"line-through":""}>{it.text}</span>
                            <div className="flex items-center gap-1 ml-auto">
                              <button type="button" className="text-xs border rounded px-2 py-0.5" disabled={idx===0} onClick={()=>moveEditChecklistItem(idx,-1)}>▲</button>
                              <button type="button" className="text-xs border rounded px-2 py-0.5" disabled={idx===editChecklist.length-1} onClick={()=>moveEditChecklistItem(idx,1)}>▼</button>
                              <button type="button" className="text-red-600" onClick={()=>removeEditChecklistItem(idx)}>Quitar</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <textarea className="border rounded px-2 py-1" rows={3} placeholder="Notas de inspección" value={editForm.notas || ""} onChange={(e)=>setEditForm({ ...editForm, notas: e.target.value })} />
                    <div className="flex items-center gap-2">
                      <button type="button" className="px-3 py-1 border rounded" onClick={()=>setEditId(null)}>Cancelar</button>
                      <button type="button" className="px-3 py-1 bg-foreground text-background rounded" onClick={()=>saveEdit(f.id)}>Guardar</button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2">
                      <span>{f.titulo}</span>
                      {f.pdfId ? (
                        <a className="text-blue-700 underline text-sm" href={`/api/tareas/fichas/file/${f.pdfId}`} target="_blank" rel="noreferrer">Ver archivo</a>
                      ) : null}
                    </div>
                    <div className="text-sm text-neutral-600">{f.descripcion}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Prioridad: {f.prioridad} · Estado: {f.estado}
                      {f.vencimiento ? ` · Vence: ${new Date(f.vencimiento).toLocaleDateString()}` : ""}
                      {f.asignado_a ? ` · Asignado: ${f.asignado_a}` : ""}
                    </div>
                    {f.instrucciones ? (
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-neutral-700">Instrucciones</div>
                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: f.instrucciones }} />
                      </div>
                    ) : null}
                    {Array.isArray(f.checklist) && f.checklist.length > 0 ? (
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-neutral-700">Checklist</div>
                        <ul className="text-sm mt-1 space-y-1">
                          {f.checklist.map((it, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <input type="checkbox" checked={!!it.done} readOnly />
                              <span className={it.done?"line-through":""}>{it.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {f.notas ? (
                      <div className="mt-2">
                        <div className="text-xs font-semibold text-neutral-700">Notas</div>
                        <div className="text-sm whitespace-pre-wrap">{f.notas}</div>
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button className="text-green-700" onClick={()=>openPreview(f)}>Ver</button>
                  {editId === f.id ? null : <button className="text-blue-700" onClick={()=>startEdit(f)} title="Editar">✏️ Editar</button>}
                  <button className="text-red-600" onClick={()=>deleteFicha(f.id)}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-neutral-600">Página {page} de {maxPage} · {total} fichas</span>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 border rounded" disabled={page<=1} onClick={()=>setPage((p)=>Math.max(1,p-1))}>Anterior</button>
              <button className="px-3 py-1 border rounded" disabled={page>=maxPage} onClick={()=>setPage((p)=>Math.min(maxPage,p+1))}>Siguiente</button>
            </div>
          </div>
        </>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={()=>setCreateOpen(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded shadow-lg w-[95vw] max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b flex items-center gap-2">
                <div className="font-medium flex-1">Nueva ficha</div>
                <div className="flex items-center gap-2">
                  <button className={`px-3 py-1 border rounded ${createTab==='form'?'bg-neutral-100':''}`} onClick={()=>setCreateTab('form')}>Formulario</button>
                  <button className={`px-3 py-1 border rounded ${createTab==='file'?'bg-neutral-100':''}`} onClick={()=>setCreateTab('file')}>Desde archivo</button>
                </div>
                <button className="ml-2 px-2 py-1 border rounded" onClick={()=>setCreateOpen(false)}>Cerrar</button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-neutral-50">
                {createTab === 'form' ? (
                  <form onSubmit={createFicha} className="p-4 border rounded bg-white flex flex-col gap-4">
                    <div>
                      <label className="block text-sm text-neutral-700 mb-1">Nombre</label>
                      <input className="w-full border rounded px-3 py-2" placeholder="Nombre" value={form.titulo} onChange={(e)=>setForm({...form, titulo:e.target.value})} required />
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-700 mb-1">Instrucciones</label>
                      <RichTextEditor value={rtContent} onChange={setRtContent} onAttach={(id, url, name)=>{ setCreatePdfId(id); setCreatePdfName(name); }} />
                      {createPdfId ? (<div className="text-xs text-neutral-600 mt-1">Archivo adjunto: <a href={`/api/tareas/fichas/file/${createPdfId}`} className="underline" target="_blank" rel="noreferrer">{createPdfName || "archivo"}</a></div>) : null}
                    </div>
                    <div>
                      <label className="block text-sm text-neutral-700 mb-1">Notas</label>
                      <textarea className="w-full border rounded px-3 py-2 min-h-[160px]" value={form.notas} onChange={(e)=>setForm({...form, notas:e.target.value})} />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" className="border rounded px-4 py-2" onClick={()=>setCreateOpen(false)}>Cancelar</button>
                      <button className="rounded bg-foreground text-background px-4 py-2" disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={createFromFile} className="p-4 border rounded bg-white flex flex-col gap-3">
                    <div className="text-sm text-neutral-600">Selecciona un archivo PDF/DOCX y crearemos la ficha automáticamente con el nombre del archivo.</div>
                    <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" />
                    <div className="flex items-center gap-2">
                      <button type="button" className="border rounded px-3 py-1" onClick={()=>setCreateOpen(false)}>Cancelar</button>
                      <button className="rounded bg-foreground text-background px-3 py-1" disabled={uploading}>{uploading?"Subiendo...":"Crear desde archivo (PDF/DOCX)"}</button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewFicha && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={closePreview} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded shadow-lg w-[95vw] max-w-5xl h-[85vh] flex flex-col overflow-hidden">
              <div className="px-4 py-2 border-b flex items-center gap-2">
                <div className="font-medium truncate flex-1">{previewFicha.titulo}</div>
                <div className="flex items-center gap-2">
                  <button className={`px-3 py-1 border rounded ${previewTab==='vista'?'bg-neutral-100':''}`} onClick={()=>setPreviewTab('vista')}>Vista</button>
                  <button className={`px-3 py-1 border rounded ${previewTab==='archivo'?'bg-neutral-100':''}`} onClick={()=>setPreviewTab('archivo')} disabled={!fileUrl} title={fileUrl?"":"Sin archivo"}>Archivo</button>
                </div>
                {fileUrl ? (
                  <>
                    <a className="text-blue-700 underline text-sm" href={fileUrl} target="_blank" rel="noreferrer">Abrir en pestaña</a>
                    <a className="text-blue-700 underline text-sm" href={fileUrl} download>Descargar</a>
                  </>
                ) : null}
                <button className="ml-2 px-2 py-1 border rounded" onClick={closePreview}>Cerrar</button>
              </div>
              <div className="flex-1 bg-neutral-50 overflow-auto">
                {previewTab === "vista" ? (
                  <div className="p-4 max-w-4xl mx-auto">
                    <div className="border rounded p-4 bg-white">
                      <div className="flex flex-wrap justify-between gap-2 mb-3">
                        <div>
                          <div className="text-xl font-semibold">{previewFicha.titulo}</div>
                          {previewFicha.descripcion ? (
                            <div className="text-sm text-neutral-700">{previewFicha.descripcion}</div>
                          ) : null}
                        </div>
                        <div className="text-xs text-neutral-700">
                          <div><span className="font-semibold">Prioridad:</span> {previewFicha.prioridad}</div>
                          <div><span className="font-semibold">Estado:</span> {previewFicha.estado}</div>
                          {previewFicha.vencimiento ? (
                            <div><span className="font-semibold">Vence:</span> {new Date(previewFicha.vencimiento).toLocaleDateString()}</div>
                          ) : null}
                          {previewFicha.asignado_a ? (
                            <div><span className="font-semibold">Asignado a:</span> {previewFicha.asignado_a}</div>
                          ) : null}
                        </div>
                      </div>
                      {previewFicha.instrucciones ? (
                        <div className="mb-3">
                          <div className="uppercase text-xs tracking-wide font-semibold text-neutral-600">Instrucciones</div>
                          <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: previewFicha.instrucciones }} />
                        </div>
                      ) : null}
                      {Array.isArray(previewFicha.checklist) && previewFicha.checklist.length > 0 ? (
                        <div className="mb-3">
                          <div className="uppercase text-xs tracking-wide font-semibold text-neutral-600">Checklist</div>
                          <ul className="mt-1 space-y-1">
                            {previewFicha.checklist.map((item, idx) => (
                              <li key={idx} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={!!item.done} readOnly />
                                <span className={item.done?"line-through":""}>{item.text}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {previewFicha.notas ? (
                        <div className="mb-3">
                          <div className="uppercase text-xs tracking-wide font-semibold text-neutral-600">Notas</div>
                          <div className="whitespace-pre-wrap text-sm">{previewFicha.notas}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  fileUrl ? (
                    <iframe title="Vista previa" src={fileUrl} className="w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-500">Sin archivo adjunto</div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}