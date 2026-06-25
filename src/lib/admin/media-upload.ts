import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MEDIA_BUCKET = "media";
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function cleanFileName(name: string) {
  return name
    .trim()
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}

/**
 * Sube una imagen al bucket público `media` y devuelve su URL pública.
 * Reutilizado por el upload de blog y de casos de éxito.
 * `folder` agrupa los archivos (ej. "blog" | "casos").
 */
export async function handleMediaUpload(request: Request, folder: string) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return NextResponse.json({ ok: false, error: "Debes adjuntar una imagen válida." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ ok: false, error: "La imagen supera 8MB." }, { status: 400 });
    }

    const { supabase } = createSupabaseServerClient();

    // Asegura el bucket (idempotente).
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      return NextResponse.json({ ok: false, error: `No se pudo listar buckets: ${listError.message}` }, { status: 500 });
    }
    if (!(buckets || []).some((bucket) => bucket.name === MEDIA_BUCKET)) {
      const { error: createError } = await supabase.storage.createBucket(MEDIA_BUCKET, { public: true });
      if (createError && !createError.message.toLowerCase().includes("already exists")) {
        return NextResponse.json(
          { ok: false, error: `No se pudo crear bucket de imágenes: ${createError.message}` },
          { status: 500 },
        );
      }
    }

    const fileBytes = Buffer.from(await file.arrayBuffer());
    const safeName = cleanFileName(file.name || folder);
    const path = `${folder}/${new Date().getFullYear()}/${randomUUID()}-${safeName}`;

    const upload = await supabase.storage.from(MEDIA_BUCKET).upload(path, fileBytes, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
    if (upload.error) {
      return NextResponse.json({ ok: false, error: `No se pudo subir la imagen: ${upload.error.message}` }, { status: 500 });
    }

    const publicUrl = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, url: publicUrl.data.publicUrl || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir imagen.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
