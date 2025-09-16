import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";
import { getModelForTenant } from "@/lib/tenant";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const tenantSlug = undefined; // placeholder for server handlers without req
    // try to resolve tenant from session if present
    // @ts-ignore
    const t = (session as any)?.user?.tenant as string | undefined;
    const tenant = t || undefined;

    let User: any;
    try {
      User = await getModelForTenant("@/models/User", "User", tenant);
    } catch (e) {
      await connectMongo();
      const mod = await import("@/models/User");
      User = mod.default;
    }

    // @ts-ignore
    const u = await User.findById(session.user?.id).lean();
    if (!u) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ id: String(u._id), name: u.name, email: u.email, role: u.role, settings: u.settings ?? {} });
  } catch (e: any) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  try {
    // @ts-ignore
    const tenant = (session as any)?.user?.tenant as string | undefined;
    let User: any;
    try {
      User = await getModelForTenant("@/models/User", "User", tenant);
    } catch (e) {
      await connectMongo();
      const mod = await import("@/models/User");
      User = mod.default;
    }

    const updates: any = {};
    if ("name" in body) updates.name = body.name;
    if ("settings" in body) updates.settings = body.settings;

    const doc = await User.findByIdAndUpdate(session.user?.id, updates, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, id: String(doc._id) });
  } catch (e: any) {
    return NextResponse.json({ error: "Error actualizando" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();

  await connectMongo();
  const { default: User } = await import("@/models/User");
  await User.updateOne({ email: session.user.email }, { $set: { name } });

  const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
  return NextResponse.redirect(`${base}/perfil`, { status: 303 });
}
