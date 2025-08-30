import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectMongo } from "@/lib/mongo";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();

  await connectMongo();
  const { default: User } = await import("@/models/User");
  await User.updateOne({ email: session.user.email }, { $set: { name } });

  return NextResponse.redirect(new URL("/perfil", req.url), { status: 303 });
}
