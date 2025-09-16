export default function ActividadPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Actividad</h1>
      <p className="text-sm text-muted-foreground">Comentarios y actualizaciones recientes.</p>

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        <a href="/actividad/suministros" className="card p-4 hover:shadow-lg transition">
          <div className="font-semibold">📦 Lista de Suministros</div>
          <div className="text-sm text-[color:var(--muted)] mt-2">Inventario rápido de materiales y consumibles.</div>
        </a>

        <a href="/actividad/mantenimiento" className="card p-4 hover:shadow-lg transition">
          <div className="font-semibold">🛠️ Registro de Mantenimiento y Reparaciones</div>
          <div className="text-sm text-[color:var(--muted)] mt-2">Registro de órdenes de trabajo, reparaciones y acciones de mantenimiento.</div>
        </a>
      </div>
    </section>
  );
}
