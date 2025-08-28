import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import Project from "@/models/Project";
import Volunteer from "@/models/Volunteer";

export async function GET(req: Request) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").toLowerCase();
    const page = Math.max(parseInt(url.searchParams.get("page") || "1", 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(url.searchParams.get("pageSize") || "20", 10) || 20, 1), 100);
    const skip = (page - 1) * pageSize;
    const match: any = {};
    if (q) match.titulo = { $regex: q, $options: "i" };

    const [itemsRaw, total] = await Promise.all([
      Project.find(match).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean(),
      Project.countDocuments(match),
    ]);

    // Resolver nombres de voluntario/ayudante en el servidor
    const ids = Array.from(
      new Set(
        (itemsRaw as any[])
          .flatMap((p: any) => [p.voluntarioId, p.ayudanteId])
          .filter((v) => !!v)
          .map((v) => String(v))
      )
    );

    let vmap = new Map<string, string>();
    if (ids.length) {
      const vdocs: any[] = await Volunteer.find({ _id: { $in: ids } })
        .select({ nombre: 1, apellido: 1 })
        .lean();
      vmap = new Map(vdocs.map((v: any) => [String(v._id), `${v.nombre || ""} ${v.apellido || ""}`.trim()]));
    }

    const items = (itemsRaw as any[]).map((p: any) => ({
      ...p,
      voluntario: p.voluntarioId ? vmap.get(String(p.voluntarioId)) || "" : null,
      ayudante: p.ayudanteId ? vmap.get(String(p.ayudanteId)) || "" : null,
    }));

    return NextResponse.json({ items, total, page, pageSize });
  } catch (e) {
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize: 20 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectMongo();

  const body = await req.json().catch(() => ({}));
  if (!body.titulo) return NextResponse.json({ error: "Título requerido" }, { status: 400 });

  // Normalizar evidencias si vienen
  let evidencias: any[] = [];
  if (Array.isArray(body.evidencias)) {
    evidencias = body.evidencias.map((e: any) => ({
      mediaId: e.mediaId,
      thumbId: e.thumbId || undefined,
      titulo: e.titulo || undefined,
      puntos: Array.isArray(e.puntos)
        ? e.puntos.map((p: any) => String(p)).filter(Boolean)
        : (typeof e.puntos === "string"
            ? e.puntos.split(/\r?\n|,|;/).map((s: string) => s.trim()).filter(Boolean)
            : []),
      created_by: session.user?.email || null,
      createdAt: new Date(),
    }));
  }

  // Normalizar checklist
  let checklist: Array<{ text: string; done: boolean }> = [];
  if (Array.isArray(body.checklist)) {
    checklist = body.checklist
      .map((item: any) => (typeof item === "string" ? { text: item, done: false } : { text: String(item?.text || ""), done: Boolean(item?.done) }))
      .filter((i: any) => i.text);
  } else if (typeof body.checklist === "string") {
    checklist = body.checklist
      .split(/\r?\n|,|;/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .map((text: string) => ({ text, done: false }));
  }

  const doc = await Project.create({
    titulo: body.titulo,
    descripcion: body.descripcion || null,
    estado: body.estado || "PLANIFICADO",
    voluntarioId: body.voluntarioId || null,
    ayudanteId: body.ayudanteId || null,
    fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : null,
    fechaFin: body.fechaFin ? new Date(body.fechaFin) : null,
    etiquetas: Array.isArray(body.etiquetas) ? body.etiquetas : [],
    evidencias,
    checklist,
    created_by: session.user?.email || null,
  });
  return NextResponse.json(doc, { status: 201 });
}
