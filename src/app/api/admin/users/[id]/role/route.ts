import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, role as RoleEnum } from "@/lib/auth";
import { db } from "@/lib/sqlite";
import { z } from "zod";
import { connectMongo } from "@/lib/mongo";
import { getModelForTenant } from "@/lib/tenant";

const roleSchema = z.object({
  role: z.enum(["ADMIN", "COORDINADOR", "USER"]),
});

export async function POST(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || r !== RoleEnum.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = roleSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const { role } = parsed.data;
  const { id } = params;

  try {
    if (process.env.MONGODB_URI) {
      const tenantSlug = req.headers.get('x-tenant-slug') || undefined;
      let User: any;
      try {
        User = await getModelForTenant("@/models/User", "User", tenantSlug);
      } catch (e) {
        await connectMongo();
        const mod = await import("@/models/User");
        User = mod.default;
      }
      const doc = await User.findByIdAndUpdate(id, { role }, { new: true });
      if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true });
    } else {
      const info = db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
      if (info.changes === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Error actualizando rol" }, { status: 500 });
  }
}
