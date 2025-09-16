import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Suministro from "@/models/Suministro";

export async function GET(req: Request) {
  await connectMongo();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "1000"), 1000);
  const skip = (page - 1) * pageSize;

  const items = await Suministro.find({}).sort({ createdAt: -1 }).skip(skip).limit(pageSize).lean();
  const total = await Suministro.countDocuments();
  return NextResponse.json({ items, total, page, pageSize });
}

export async function POST(req: Request) {
  await connectMongo();
  const body = await req.json();
  if (!body.nombre || !("cantidadComprada" in body)) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  const s = await Suministro.create({
    nombre: body.nombre,
    proveedor: body.proveedor || undefined,
    idArticulo: body.idArticulo || undefined,
    costo: body.costo ? Number(body.costo) : undefined,
    cantidadComprada: Number(body.cantidadComprada || 0),
    cantidadExistencia: typeof body.cantidadExistencia !== "undefined" ? Number(body.cantidadExistencia) : Number(body.cantidadComprada || 0),
  });
  return NextResponse.json(s);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  await connectMongo();
  try {
    await Suministro.deleteOne({ _id: id });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "error eliminando" }, { status: 500 });
  }
}
