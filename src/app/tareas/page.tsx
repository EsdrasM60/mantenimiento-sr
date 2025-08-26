export default function TareasPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Tareas</h1>
      <p className="text-sm text-muted-foreground">Lista de trabajos y su estado.</p>
      <div className="pt-2">
        <a href="/tareas/fichas" className="inline-flex items-center gap-2 rounded border px-3 py-2 hover:bg-neutral-50">
          <span>📂 Fichas</span>
        </a>
      </div>
    </section>
  );
}
