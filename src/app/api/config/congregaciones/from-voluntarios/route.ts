import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Volunteer from "@/models/Volunteer";

export async function GET() {
  await connectMongo();
  const rows = await Volunteer.find({ congregacion: { $ne: null } }).select('congregacion').lean();
  const set = new Set<string>();
  for (const r of rows) {
    if (r.congregacion && typeof r.congregacion === 'string') set.add(r.congregacion.trim());
  }
  return NextResponse.json({ congregaciones: Array.from(set).sort() });
}
