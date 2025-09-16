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

export async function POST(req: Request) {
  await connectMongo();
  try {
    const body = await req.json();
    const { titulo } = body || {};
    if (!titulo || typeof titulo !== "string") {
      return NextResponse.json({ error: "titulo is required" }, { status: 400 });
    }

    const created = await Project.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/proyectos error:", err);
    return NextResponse.json({ error: err?.message || "unknown" }, { status: 500 });
  }
}

export function OPTIONS() {
  // Respond to preflight requests (useful if the browser triggers an OPTIONS check)
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS,PUT,PATCH,DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
