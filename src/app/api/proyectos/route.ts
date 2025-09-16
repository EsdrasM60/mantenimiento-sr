import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { getTenantBySlug, connectTenantDb } from "@/lib/tenant";
import ProjectModel from "@/models/Project";

export async function GET(req: Request) {
  // intentar tenant desde header
  const tenantSlug = req.headers.get('x-tenant-slug');
  let Project: any = ProjectModel;

  if (tenantSlug) {
    const tenant = await getTenantBySlug(tenantSlug);
    if (tenant) {
      const conn = await connectTenantDb(tenant as any);
      const m = await import("@/models/Project");
      Project = conn.model('Project', (m.default as any).schema);
    }
  }

  if (!Project) {
    await connectMongo();
    Project = ProjectModel;
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 200);
  const skip = (page - 1) * pageSize;

  const items = await Project.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .select({ titulo: 1, descripcion: 1, estado: 1, voluntarioId: 1, ayudanteId: 1, fechaInicio: 1, fechaFin: 1, checklist: 1, evidencias: 1 })
    .lean();

  const total = await Project.countDocuments({});
  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: Request) {
  try {
    // intentar tenant desde header
    const tenantSlug = req.headers.get('x-tenant-slug');
    let Project: any = ProjectModel;

    if (tenantSlug) {
      const tenant = await getTenantBySlug(tenantSlug);
      if (tenant) {
        const conn = await connectTenantDb(tenant as any);
        const m = await import("@/models/Project");
        Project = conn.model('Project', (m.default as any).schema);
      }
    }

    if (!Project) {
      await connectMongo();
      Project = ProjectModel;
    }

    const body = await req.json().catch(() => ({}));
    const titulo = body?.titulo || body?.title;
    if (!titulo) return NextResponse.json({ error: "Falta titulo" }, { status: 400 });

    const docData: any = {
      titulo: String(titulo),
      descripcion: body?.descripcion ?? null,
      estado: body?.estado || 'PLANIFICADO',
      voluntarioId: body?.voluntarioId || null,
      ayudanteId: body?.ayudanteId || null,
      fechaInicio: body?.fechaInicio ? new Date(body.fechaInicio) : null,
      fechaFin: body?.fechaFin ? new Date(body.fechaFin) : null,
      evidencias: Array.isArray(body?.evidencias) ? body.evidencias : [],
      checklist: Array.isArray(body?.checklist)
        ? body.checklist.map((item: any) => (typeof item === 'string' ? { text: item, done: false } : { text: String(item?.text || ''), done: Boolean(item?.done) })).filter((i: any) => i.text)
        : [],
      etiquetas: Array.isArray(body?.etiquetas) ? body.etiquetas : [],
    };

    const created = await Project.create(docData);
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-slug",
    },
  });
}
