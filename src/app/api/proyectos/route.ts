import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongo";
import Project from "@/models/Project";

export async function GET(req: Request) {
  await connectMongo();
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 200);
  const skip = (page - 1) * pageSize;

  const items = await Project.find({})
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .select({ titulo: 1, descripcion: 1, estado: 1, voluntarioId: 1, ayudanteId: 1, fechaInicio: 1, fechaFin: 1, checklist: 1, evidencias: 1 })
    .lean();

  const total = await Project.countDocuments({});
  return NextResponse.json({ items, total, page, pageSize });
}
