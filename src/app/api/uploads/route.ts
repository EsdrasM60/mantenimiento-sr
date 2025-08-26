import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGridFSBucket } from "@/lib/gridfs";
import { Readable } from "stream";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Debe enviar un formulario multipart/form-data" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Campo 'file' requerido" }, { status: 400 });
  }

  const contentType = (file as any).type || "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 415 });
  }

  const bucket = await getGridFSBucket();

  // Convertir Web ReadableStream a Node Readable
  // @ts-ignore - Node 18+ soporta Readable.fromWeb
  const nodeStream = Readable.fromWeb(file.stream());
  const filename = (file as any).name || "upload";

  const metadata = {
    userEmail: session.user?.email || undefined,
    userName: session.user?.name || undefined,
    originalName: filename,
  } as Record<string, any>;

  const uploadStream = bucket.openUploadStream(filename, {
    contentType,
    metadata,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      nodeStream
        .on("error", reject)
        .pipe(uploadStream)
        .on("error", reject)
        .on("finish", () => resolve());
    });

    return NextResponse.json({
      id: String(uploadStream.id),
      filename: uploadStream.filename,
      contentType,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Error subiendo imagen" }, { status: 500 });
  }
}
