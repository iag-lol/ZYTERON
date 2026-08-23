import { NextResponse } from "next/server";

import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import {
  buildImportPreview,
  executeImport,
  parseSpreadsheet,
  type ImportFieldKey,
  type ImportPreview,
} from "@/lib/sales-ai/importer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Paso 1: subir el archivo y obtener encabezados + mapeo sugerido.
 * Paso 2 (?step=preview): validar y detectar duplicados.
 * Paso 3 (?step=import): importar y dejar a Zara trabajando.
 *
 * Ninguno de estos pasos usa IA ni envía correo: son lectura de archivo,
 * consultas a la base y la inserción de trabajos pendientes en la cola. La
 * redacción y el envío ocurren después, en el cron, de a pocos por ejecución.
 */
export async function POST(request: Request) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;
  const actor = auth.legacy ? "admin" : (auth.session.user.id ?? "admin");

  const url = new URL(request.url);
  const step = url.searchParams.get("step") ?? "parse";

  try {
    if (step === "parse") {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json({ error: "El archivo supera los 8 MB." }, { status: 400 });
      }

      const buffer = await file.arrayBuffer();
      const parsed = parseSpreadsheet(buffer);

      return NextResponse.json({
        fileName: file.name,
        headers: parsed.headers,
        suggestedMapping: parsed.suggestedMapping,
        rows: parsed.rows,
        totalRows: parsed.rows.length,
      });
    }

    const body = (await request.json()) as {
      rows?: Record<string, string>[];
      mapping?: Record<string, ImportFieldKey | "">;
      fileName?: string;
      preview?: ImportPreview;
    };

    if (step === "preview") {
      if (!Array.isArray(body.rows) || !body.mapping) {
        return NextResponse.json({ error: "Faltan filas o mapeo de columnas." }, { status: 400 });
      }
      const preview = await buildImportPreview(body.rows, body.mapping);
      return NextResponse.json({ preview });
    }

    if (step === "import") {
      if (!body.preview || !body.mapping) {
        return NextResponse.json({ error: "Falta la previsualización confirmada." }, { status: 400 });
      }
      const result = await executeImport({
        fileName: body.fileName ?? "importacion.xlsx",
        mapping: body.mapping,
        preview: body.preview,
        actor,
      });
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Paso no reconocido." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al procesar el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
