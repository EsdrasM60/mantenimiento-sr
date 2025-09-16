import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, role as RoleEnum } from "@/lib/auth";
import { db } from "@/lib/sqlite";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectMongo } from "@/lib/mongo";
import { getModelForTenant } from "@/lib/tenant";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || (r !== RoleEnum.ADMIN && r !== RoleEnum.COORDINADOR)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.MONGODB_URI) {
    const tenantSlug = req.headers.get('x-tenant-slug') || undefined;
    try {
      let User: any;
      try {
        User = await getModelForTenant("@/models/User", "User", tenantSlug);
      } catch (e) {
        await connectMongo();
        const mod = await import("@/models/User");
        User = mod.default;
      }
      const rows = await User.find({}, { name: 1, email: 1, role: 1, emailVerified: 1, createdAt: 1 })
        .sort({ createdAt: -1 })
        .lean();
      return NextResponse.json(rows.map((u: any) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        role: u.role,
        emailVerified: !!u.emailVerified,
        createdAt: u.createdAt,
      })));
    } catch (e: any) {
      return NextResponse.json({ error: "Error consultando" }, { status: 500 });
    }
  }

  const rows = db
    .prepare(
      "SELECT id, name, email, role, email_verified as emailVerified, datetime(created_at) as createdAt FROM users ORDER BY created_at DESC"
    )
    .all();
  return NextResponse.json(rows);
}

const createSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  email: z.string().email(),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(["ADMIN", "COORDINADOR", "VOLUNTARIO"]).default("VOLUNTARIO"),
  approved: z.boolean().default(true),
  tenant: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || (r !== RoleEnum.ADMIN && r !== RoleEnum.COORDINADOR)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { name, email, password, role, approved, tenant } = parsed.data;
  const password_hash = bcrypt.hashSync(password, 10);

  try {
    if (process.env.MONGODB_URI) {
      if (tenant) {
        try {
          const User = await getModelForTenant("@/models/User", "User", tenant);
          const exists = await User.findOne({ email }).lean();
          if (exists) return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
          const created = await User.create({ name, email, passwordHash: password_hash, role, emailVerified: approved });
          return NextResponse.json({ id: String(created._id), name, email, role, emailVerified: approved, createdAt: created.createdAt }, { status: 201 });
        } catch (e: any) {
          return NextResponse.json({ error: "Error creando usuario en tenant" }, { status: 500 });
        }
      }

      await connectMongo();
      const { default: User } = await import("@/models/User");
      const exists = await User.findOne({ email }).lean();
      if (exists) return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
      const created = await User.create({ name, email, passwordHash: password_hash, role, emailVerified: approved });
      return NextResponse.json({ id: String(created._id), name, email, role, emailVerified: approved, createdAt: created.createdAt }, { status: 201 });
    } else {
      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO users (id, name, email, password_hash, role, email_verified)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, name, email, password_hash, role, approved ? 1 : 0);
      const row = db
        .prepare(
          "SELECT id, name, email, role, email_verified as emailVerified, datetime(created_at) as createdAt FROM users WHERE id = ?"
        )
        .get(id);
      return NextResponse.json(row, { status: 201 });
    }
  } catch (e: any) {
    if (String(e?.message || e).includes("UNIQUE")) {
      return NextResponse.json({ error: "El correo ya está registrado" }, { status: 409 });
    }
    return NextResponse.json({ error: "Error creando usuario" }, { status: 500 });
  }
}
