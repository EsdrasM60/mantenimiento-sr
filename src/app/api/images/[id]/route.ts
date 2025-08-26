import { NextResponse } from "next/server";
import { getGridFSBucket, toObjectId } from "@/lib/gridfs";
import { getServerSession } from "next-auth";
import { authOptions, role as RoleEnum } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const _id = toObjectId(params.id);
  if (!_id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const bucket = await getGridFSBucket();

  const files = await bucket.find({ _id }).toArray();
  if (!files || files.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const file = files[0];
  const stream = bucket.openDownloadStream(_id);

  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || r !== RoleEnum.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const _id = toObjectId(params.id);
  if (!_id) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const bucket = await getGridFSBucket();
  try {
    await bucket.delete(_id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error eliminando imagen" }, { status: 500 });
  }
}
