import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import PlanSemanal from "@/models/PlanSemanal";

export async function POST(req: Request) {
  await connectMongo();
  const { year, month, semana, congregacion } = await req.json();
  if (!year || !month || !semana || !congregacion)
    return NextResponse.json({ error: "Campos requeridos" }, { status: 400 });

  const doc = await PlanSemanal.findOneAndUpdate(
    { year, month },
    { $setOnInsert: { year, month }, $push: { asignaciones: { semana, congregacion, year, month, completado: false } } },
    { new: true, upsert: true }
  ).lean();
  return NextResponse.json({ item: doc });
}

export async function PATCH(req: Request) {
  await connectMongo();
  const { year, month, semana, completado, notas, congregacion } = await req.json();
  if (!year || !month || !semana)
    return NextResponse.json({ error: "Campos requeridos" }, { status: 400 });

  const doc = await PlanSemanal.findOneAndUpdate(
    { year, month, "asignaciones.semana": semana },
    { $set: { "asignaciones.$.completado": !!completado, ...(typeof notas === "string" ? { "asignaciones.$.notas": notas } : {}), ...(congregacion ? { "asignaciones.$.congregacion": congregacion } : {}) } },
    { new: true }
  ).lean();
  return NextResponse.json({ item: doc });
}
