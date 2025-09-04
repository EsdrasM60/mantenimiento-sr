import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import GlobalConfig from "@/models/GlobalConfig";

export async function GET() {
  await connectMongo();
  const cfg = await GlobalConfig.findOne({ key: 'global' }).lean();
  return NextResponse.json({ congregaciones: cfg?.congregaciones || [] });
}

export async function POST(req: Request) {
  await connectMongo();
  const { congregaciones } = await req.json();
  if (!Array.isArray(congregaciones)) return NextResponse.json({ error: 'congregaciones debe ser array' }, { status: 400 });
  const doc = await GlobalConfig.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' }, $set: { congregaciones } },
    { new: true, upsert: true }
  ).lean();
  return NextResponse.json({ congregaciones: doc.congregaciones });
}
