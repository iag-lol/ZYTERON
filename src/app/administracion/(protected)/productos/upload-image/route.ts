import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ZYTERON_PRODUCT_BUCKET } from "@/lib/company";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function cleanFileName(name: string) {
  return name
    .trim()
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}

export async function POST(request: Request) {
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
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      return NextResponse.json({ ok: false, error: `No se pudo listar buckets: ${listError.message}` }, { status: 500 });
    }

    const bucketExists = (buckets || []).some((bucket) => bucket.name === ZYTERON_PRODUCT_BUCKET);
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(ZYTERON_PRODUCT_BUCKET, { public: true });
      if (createError && !createError.message.toLowerCase().includes("already exists")) {
        return NextResponse.json(
          { ok: false, error: `No se pudo crear bucket de imágenes: ${createError.message}` },
          { status: 500 },
        );
      }
    }

    const fileBytes = Buffer.from(await file.arrayBuffer());
    const safeName = cleanFileName(file.name || "producto");
    const path = `products/${new Date().getFullYear()}/${randomUUID()}-${safeName}`;

    const upload = await supabase.storage
      .from(ZYTERON_PRODUCT_BUCKET)
      .upload(path, fileBytes, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (upload.error) {
      return NextResponse.json({ ok: false, error: `No se pudo subir la imagen: ${upload.error.message}` }, { status: 500 });
    }

    const publicUrl = supabase.storage.from(ZYTERON_PRODUCT_BUCKET).getPublicUrl(path);
    return NextResponse.json({ ok: true, url: publicUrl.data.publicUrl || null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir imagen.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
