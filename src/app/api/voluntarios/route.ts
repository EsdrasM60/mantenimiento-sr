import { NextResponse } from "next/server";
import { db } from "@/lib/sqlite";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { connectMongo } from "@/lib/mongo";

const schema = z.object({
  nombre: z.string().min(2),
  apellido: z.string().min(2),
  telefono: z.string().optional().nullable(),
  congregacion: z.string().optional().nullable(),
  a2: z.boolean().optional().default(false),
  trabajo_altura: z.boolean().optional().default(false),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (process.env.MONGODB_URI) {
    try {
      await connectMongo();
      const { default: Volunteer } = await import("@/models/Volunteer");
      const docs = await Volunteer.find({}).sort({ createdAt: -1 }).lean();
      const rows = docs.map((d: any) => ({
        id: String(d._id),
        nombre: d.nombre,
        apellido: d.apellido,
        telefono: d.telefono ?? null,
        congregacion: d.congregacion ?? null,
        a2: !!d.a2,
        trabajo_altura: !!d.trabajo_altura,
        createdAt: d.createdAt,
      }));
      return NextResponse.json(rows);
    } catch (e: any) {
      return NextResponse.json({ error: "Error consultando" }, { status: 500 });
    }
  }

  const rows = db
    .prepare(
      "SELECT id, nombre, apellido, telefono, congregacion, a2, trabajo_altura, datetime(created_at) as createdAt FROM volunteers ORDER BY created_at DESC"
    )
    .all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { nombre, apellido, telefono, congregacion, a2, trabajo_altura } = parsed.data;

  if (process.env.MONGODB_URI) {
    try {
      await connectMongo();
      const { default: Volunteer } = await import("@/models/Volunteer");
      const doc = await Volunteer.create({
        nombre,
        apellido,
        telefono: telefono ?? null,
        congregacion: congregacion ?? null,
        a2: !!a2,
        trabajo_altura: !!trabajo_altura,
        created_by: session.user?.email ?? null,
      });
      return NextResponse.json({ ok: true, id: String(doc._id) });
    } catch (e: any) {
      return NextResponse.json({ error: "Error creando" }, { status: 500 });
    }
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO volunteers (id, nombre, apellido, telefono, congregacion, a2, trabajo_altura, created_by)
     VALUES (@id, @nombre, @apellido, @telefono, @congregacion, @a2, @trabajo_altura, @created_by)`
  ).run({
    id,
    nombre,
    apellido,
    telefono: telefono ?? null,
    congregacion: congregacion ?? null,
    a2: a2 ? 1 : 0,
    trabajo_altura: trabajo_altura ? 1 : 0,
    created_by: session.user?.email ?? null,
  });

  return NextResponse.json({ ok: true, id });
}
