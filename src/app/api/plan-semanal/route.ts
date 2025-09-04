import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PlanSemanal from "@/models/PlanSemanal";

export async function GET(req: Request) {
  try {
    await connectMongo();
    const url = new URL(req.url);
    const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(url.searchParams.get("month") || String(new Date().getMonth() + 1));

    const doc = await PlanSemanal.findOne({ year, month }).lean();
    const item = doc ?? { year, month, congregaciones: [], asignaciones: [] };
    return NextResponse.json({ item });
  } catch (e: any) {
    console.error("/api/plan-semanal GET error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await connectMongo();
    const body = await req.json();
    const { year, month, congregaciones } = body;
    if (!year || !month)
      return NextResponse.json({ error: "year y month requeridos" }, { status: 400 });

    const update: any = { $setOnInsert: { year, month } };
    if (Array.isArray(congregaciones)) {
      update.$set = { congregaciones };
    }

    const doc = await PlanSemanal.findOneAndUpdate(
      { year, month },
      update,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean();

    const item = doc ?? { year, month, congregaciones: Array.isArray(congregaciones) ? congregaciones : [], asignaciones: [] };
    return NextResponse.json({ item });
  } catch (e: any) {
    console.error("/api/plan-semanal POST error:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
  }
}
