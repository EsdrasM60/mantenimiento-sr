import { NextResponse } from "next/server";
import { getGridFSBucket, toObjectId, getGridFSBucketForTenant } from "@/lib/gridfs";
import { getServerSession } from "next-auth";
import { authOptions, role as RoleEnum } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const originalIdStr = params.id;
  const _id = toObjectId(originalIdStr);
  if (!_id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const url = new URL(req.url);
  const thumb = url.searchParams.get("thumb") === "1";
  const tenantSlug = req.headers.get('x-tenant-slug') || undefined;

  if (thumb) {
    const bucketThumb = tenantSlug ? await getGridFSBucketForTenant("uploads_thumb", tenantSlug) : await getGridFSBucket("uploads_thumb");
    // Buscar por _id (nuevo flujo)
    let files = await bucketThumb.find({ _id }).toArray();
    if (!files || files.length === 0) {
      // Compatibilidad: buscar miniatura por metadata.thumbOf
      files = await bucketThumb.find({ "metadata.thumbOf": originalIdStr }).limit(1).toArray();
      if (files && files.length > 0) {
        const file = files[0];
        // validar tenant metadata si bucket multi-tenant
        if (tenantSlug && file.metadata && file.metadata.tenant && file.metadata.tenant !== tenantSlug) {
          // no pertenece al tenant
          return NextResponse.json({ error: "No encontrado" }, { status: 404 });
        }
        const stream = bucketThumb.openDownloadStream(file._id);
        return new Response(stream as unknown as ReadableStream, {
          headers: {
            "Content-Type": file.contentType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    } else {
      const file = files[0];
      if (tenantSlug && file.metadata && file.metadata.tenant && file.metadata.tenant !== tenantSlug) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      }
      const stream = bucketThumb.openDownloadStream(_id);
      return new Response(stream as unknown as ReadableStream, {
        headers: {
          "Content-Type": file.contentType || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }
    // Si no hay miniatura, devolver original como fallback
    const bucketOrig = tenantSlug ? await getGridFSBucketForTenant("uploads", tenantSlug) : await getGridFSBucket("uploads");
    const f2 = await bucketOrig.find({ _id }).limit(1).toArray();
    if (!f2 || f2.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    const file2 = f2[0];
    if (tenantSlug && file2.metadata && file2.metadata.tenant && file2.metadata.tenant !== tenantSlug) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    const stream2 = bucketOrig.openDownloadStream(_id);
    return new Response(stream2 as unknown as ReadableStream, {
      headers: {
        "Content-Type": file2.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  // No thumb: devolver original
  const bucket = tenantSlug ? await getGridFSBucketForTenant("uploads", tenantSlug) : await getGridFSBucket("uploads");
  const files = await bucket.find({ _id }).toArray();
  if (!files || files.length === 0) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const file = files[0];
  if (tenantSlug && file.metadata && file.metadata.tenant && file.metadata.tenant !== tenantSlug) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const stream = bucket.openDownloadStream(_id);
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      "Content-Type": file.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(_req: Request, context: any) {
  const { params } = context as { params: { id: string } };
  const session = await getServerSession(authOptions);
  // @ts-ignore
  const r = session?.user?.role as string | undefined;
  if (!session || r !== RoleEnum.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantSlug = _req.headers.get('x-tenant-slug') || undefined;
  const _id = toObjectId(params.id);
  if (!_id) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const bucket = tenantSlug ? await getGridFSBucketForTenant(undefined, tenantSlug) : await getGridFSBucket();
  try {
    await bucket.delete(_id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error eliminando imagen" }, { status: 500 });
  }
}
