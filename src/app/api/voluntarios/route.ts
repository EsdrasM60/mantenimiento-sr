import { NextResponse } from "next/server";
import { db } from "@/lib/sqlite";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { connectMongo } from "@/lib/mongo";

const schema = z.object({
  nombre: z.string().min(2),
  apellido: z.string().min(2),
  email: z.string().email().optional().nullable(),
  telefono: z.string().optional().nullable(),
  congregacion: z.string().optional().nullable(),
  a2: z.boolean().optional().default(false),
  trabajo_altura: z.boolean().optional().default(false),
});

function makeShortId(seed: string) {
  // hash simple y estable -> 100..999
  let h = 0 >>> 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return String(100 + (h % 900));
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (process.env.MONGODB_URI) {
    try {
      await connectMongo();
      const { default: Volunteer } = await import("@/models/Volunteer");
      const docs = await Volunteer.find({})
        .collation({ locale: "es", strength: 1 })
        .sort({ apellido: 1, nombre: 1 })
        .lean();
      const rows = docs.map((d: any) => ({
        id: String(d._id),
        shortId: d.shortId || makeShortId(String(d._id)),
        nombre: d.nombre,
        apellido: d.apellido,
        email: d.email ?? null,
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
      "SELECT id, short_id as shortId, nombre, apellido, email, telefono, congregacion, a2, trabajo_altura, datetime(created_at) as createdAt FROM volunteers ORDER BY lower(apellido) ASC, lower(nombre) ASC"
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

  // Normalizar entradas
  let { nombre, apellido, email, telefono, congregacion, a2, trabajo_altura } = parsed.data as any;
  nombre = String(nombre).trim();
  apellido = String(apellido).trim();
  email = email ? String(email).trim().toLowerCase() : null;

  // Chequeo de duplicados por nombre+apellido (case-insensitive)
  if (process.env.MONGODB_URI) {
    try {
      await connectMongo();
      const { default: Volunteer } = await import("@/models/Volunteer");
      const dup = await Volunteer.findOne({ nombre: new RegExp(`^${nombre}$`, "i"), apellido: new RegExp(`^${apellido}$`, "i") }).lean();
      if (dup) {
        return NextResponse.json({ error: "Ya existe un voluntario con ese nombre y apellido" }, { status: 409 });
      }
      if (email) {
        const dupEmail = await Volunteer.findOne({ email }).lean();
        if (dupEmail) return NextResponse.json({ error: "Ese correo ya está registrado" }, { status: 409 });
      }

      // generar shortId único con hasta 5 reintentos
      let shortId = makeShortId(`${nombre}-${apellido}-${Date.now()}`);
      for (let i = 0; i < 5; i++) {
        const exists = await Volunteer.findOne({ shortId }).lean();
        if (!exists) break;
        shortId = makeShortId(`${nombre}-${apellido}-${Date.now()}-${i}`);
      }

      const doc = await Volunteer.create({
        nombre,
        apellido,
        email,
        telefono: telefono ?? null,
        congregacion: congregacion ?? null,
        a2: !!a2,
        trabajo_altura: !!trabajo_altura,
        created_by: session.user?.email ?? null,
        shortId,
      });
      return NextResponse.json({ ok: true, id: String(doc._id), shortId });
    } catch (e: any) {
      return NextResponse.json({ error: "Error creando" }, { status: 500 });
    }
  }

  // SQLite
  const dup = db
    .prepare("SELECT id FROM volunteers WHERE lower(nombre)=lower(?) AND lower(apellido)=lower(?) LIMIT 1")
    .get(nombre, apellido) as { id: string } | undefined;
  if (dup) {
    return NextResponse.json({ error: "Ya existe un voluntario con ese nombre y apellido" }, { status: 409 });
  }
  if (email) {
    const dupEmail = db.prepare("SELECT id FROM volunteers WHERE lower(email)=lower(?) LIMIT 1").get(email) as { id: string } | undefined;
    if (dupEmail) return NextResponse.json({ error: "Ese correo ya está registrado" }, { status: 409 });
  }

  const id = crypto.randomUUID();
  const shortId = makeShortId(`${nombre}-${apellido}-${Date.now()}`);
  db.prepare(
    `INSERT INTO volunteers (id, nombre, apellido, email, telefono, congregacion, a2, trabajo_altura, created_by, short_id)
     VALUES (@id, @nombre, @apellido, @email, @telefono, @congregacion, @a2, @trabajo_altura, @created_by, @short_id)`
  ).run({
    id,
    nombre,
    apellido,
    email,
    telefono: telefono ?? null,
    congregacion: congregacion ?? null,
    a2: a2 ? 1 : 0,
    trabajo_altura: trabajo_altura ? 1 : 0,
    created_by: session.user?.email ?? null,
    short_id: shortId,
  });

  return NextResponse.json({ ok: true, id, shortId });
}
