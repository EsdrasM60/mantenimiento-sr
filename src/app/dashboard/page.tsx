import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  const name = session?.user?.name || session?.user?.email || "Usuario";
  return (
    <section className="space-y-6">
      {/* Saludo movido al navbar, mantener el contenido del dashboard limpio */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Tareas activas</h2>
          <p className="text-sm text-muted-foreground">Resumen de tareas asignadas esta semana.</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Próximos turnos</h2>
          <p className="text-sm text-muted-foreground">Tu calendario de servicio.</p>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold">Actividad reciente</h2>
          <p className="text-sm text-muted-foreground">Fotos, comentarios y actualizaciones.</p>
        </div>
      </div>
    </section>
  );
}
