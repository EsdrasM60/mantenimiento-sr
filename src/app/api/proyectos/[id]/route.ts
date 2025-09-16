import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import { getTenantBySlug, connectTenantDb } from "@/lib/tenant";
import ProjectModel from "@/models/Project";

export async function PATCH(req: Request, context: any) {
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

    const { params } = context as { params: { id: string } };
    const { id } = params;
    const body = await req.json().catch(() => ({}));

    // Operaciones sobre evidencias
    if (Array.isArray(body.addEvidencias) && body.addEvidencias.length > 0) {
      const toAdd = body.addEvidencias.map((e: any) => ({
        mediaId: e.mediaId,
        thumbId: e.thumbId || undefined,
        titulo: e.titulo || undefined,
        puntos: Array.isArray(e.puntos) ? e.puntos : [],
        created_by: body.actor || undefined,
        createdAt: new Date(),
      }));
      const doc = await Project.findByIdAndUpdate(
        id,
        { $push: { evidencias: { $each: toAdd } } },
        { new: true }
      ).lean();
      if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json(doc);
    }

    if (Array.isArray(body.removeEvidenciaIds) && body.removeEvidenciaIds.length > 0) {
      const doc = await Project.findByIdAndUpdate(
        id,
        { $pull: { evidencias: { mediaId: { $in: body.removeEvidenciaIds } } } },
        { new: true }
      ).lean();
      if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json(doc);
    }

    const updates: any = {};
    if ("titulo" in body) updates.titulo = body.titulo || null;
    if ("descripcion" in body) updates.descripcion = body.descripcion || null;
    if ("estado" in body) updates.estado = body.estado || "PLANIFICADO";
    if ("voluntarioId" in body) updates.voluntarioId = body.voluntarioId || null;
    if ("ayudanteId" in body) updates.ayudanteId = body.ayudanteId || null;
    if ("fechaInicio" in body) updates.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null;
    if ("fechaFin" in body) updates.fechaFin = body.fechaFin ? new Date(body.fechaFin) : null;
    if ("etiquetas" in body && Array.isArray(body.etiquetas)) updates.etiquetas = body.etiquetas;
    // NUEVO: actualizar checklist
    if ("checklist" in body) {
      updates.checklist = Array.isArray(body.checklist)
        ? body.checklist
            .map((item: any) => (typeof item === "string" ? { text: item, done: false } : { text: String(item?.text || ""), done: Boolean(item?.done) }))
            .filter((i: any) => i.text)
        : (typeof body.checklist === "string"
            ? body.checklist.split(/\r?\n|,|;/).map((s: string) => s.trim()).filter(Boolean).map((text: string) => ({ text, done: false }))
            : []);
    }

    const doc = await Project.findByIdAndUpdate(id, updates, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, context: any) {
  try {
    // intentar tenant desde header
    const tenantSlug = _req.headers.get('x-tenant-slug');
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

    const { params } = context as { params: { id: string } };
    const { id } = params;
    const res = await Project.deleteOne({ _id: id });
    if (res.deletedCount === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}

// Nuevo: obtener proyecto por id (con evidencias)
export async function GET(_req: Request, context: any) {
  try {
    // intentar tenant desde header
    const tenantSlug = _req.headers.get('x-tenant-slug');
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

    const { params } = context as { params: { id: string } };
    const { id } = params;
    const doc = await Project.findById(id).lean();
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (e) {
    return NextResponse.json({ error: "Unexpected" }, { status: 500 });
  }
}
