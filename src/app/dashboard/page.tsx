import { auth, role as RoleEnum } from "@/lib/auth";
import ProgramasPendientesWidget from "./ProgramasPendientesWidget";
import ProyectosWidget from "./ProyectosWidget";
import { headers } from "next/headers";

export default async function DashboardPage() {
  const session = await auth();
  const userName = session?.user?.name || session?.user?.email || "";
  const userRole = (session?.user as any)?.role as string | undefined;
  const isAdmin = userRole === RoleEnum.ADMIN;

  const now = new Date();
  const yy = now.getFullYear();
  const base = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${process.env.PORT || 3000}`);

  // Programa pendientes (ya existente)
  const urlProg = `${base}/api/tareas/programa?page=1&pageSize=500&pending=1&year=${yy}`;
  const resProg = await fetch(urlProg, { cache: "no-store" }).catch(() => null);
  const dataProg = (await resProg?.json().catch(() => null)) as any;
  const programas = (dataProg?.items || []) as any[];

  // Voluntarios para mapear nombres (reenviando cookies para autenticación)
  const hdrs = await headers();
  const cookieHeader = hdrs.get("cookie") ?? "";
  const resVol = await fetch(`${base}/api/voluntarios`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  }).catch(() => null);
  const volList = (await resVol?.json().catch(() => null)) as Array<{ id?: string; _id?: string; nombre?: string; apellido?: string }> | null;
  const volMap = new Map<string, string>();
  (Array.isArray(volList) ? volList : []).forEach((v) => {
    const id = String(v._id || v.id || "");
    if (id) volMap.set(id, `${v.nombre || ""} ${v.apellido || ""}`.trim());
  });

  // Proyectos resumen
  const urlPro = `${base}/api/proyectos?page=1&pageSize=200`;
  const resPro = await fetch(urlPro, { cache: "no-store" }).catch(() => null);
  const dataPro = (await resPro?.json().catch(() => null)) as { items?: any[] } | null;
  const proyectos = (dataPro?.items || []).map((p: any) => ({
    _id: String(p._id),
    titulo: p.titulo as string,
    descripcion: p.descripcion ?? null,
    estado: (p.estado || "PLANIFICADO") as any,
    voluntario: p.voluntarioId ? volMap.get(String(p.voluntarioId)) || "" : null,
    ayudante: p.ayudanteId ? volMap.get(String(p.ayudanteId)) || "" : null,
    fechaInicio: p.fechaInicio ?? null,
    fechaFin: p.fechaFin ?? null,
    checklist: Array.isArray(p.checklist) ? p.checklist : [],
  }));

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <ProgramasPendientesWidget items={programas} isAdmin={isAdmin} userName={userName} />
      <ProyectosWidget items={proyectos} isAdmin={isAdmin} userName={userName} />
    </section>
  );
}
