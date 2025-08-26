import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, role as RoleEnum } from "@/lib/auth";
import { db } from "@/lib/sqlite";
import { connectMongo } from "@/lib/mongo";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || (r !== RoleEnum.ADMIN && r !== RoleEnum.COORDINADOR)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    if (process.env.MONGODB_URI) {
      await connectMongo();
      const { default: User } = await import("@/models/User");
      const doc = await User.findByIdAndUpdate(id, { emailVerified: new Date() }, { new: true });
      if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true });
    } else {
      const info = db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(id);
      if (info.changes === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "Error aprobando" }, { status: 500 });
  }
}
