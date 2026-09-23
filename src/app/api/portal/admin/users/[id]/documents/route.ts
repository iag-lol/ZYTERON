import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { logPortalAdminAction } from "@/lib/portal/audit";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const CLIENT_FILES_BUCKET = "client-files";
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const schema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  category: z.string().trim().min(2).max(80),
  fileUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => value.startsWith("https://"), "La URL del archivo debe usar HTTPS.")
    .optional(),
  fileName: z.string().trim().max(180).optional().or(z.literal("")),
  mimeType: z.string().trim().max(120).optional().or(z.literal("")),
  fileSize: z.number().int().nonnegative().optional(),
  projectId: z.string().trim().optional().or(z.literal("")),
  quoteId: z.string().trim().optional().or(z.literal("")),
  taxDocumentId: z.string().trim().optional().or(z.literal("")),
  processId: z.string().trim().optional().or(z.literal("")),
});

type Context = { params: Promise<{ id: string }> };

function safeFileName(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\w.\-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .slice(0, 120) || "documento"
  );
}

async function assertLinksBelongToClient(
  clientId: string,
  links: { projectId?: string; quoteId?: string; taxDocumentId?: string; processId?: string },
) {
  const [project, quote, taxDocument, process] = await Promise.all([
    links.projectId
      ? prisma.project.findFirst({ where: { id: links.projectId, clientId }, select: { id: true } })
      : null,
    links.quoteId
      ? prisma.quote.findFirst({
          where: { id: links.quoteId, userId: clientId },
          select: { id: true },
        })
      : null,
    links.taxDocumentId
      ? prisma.taxDocument.findFirst({
          where: { id: links.taxDocumentId, clientId },
          select: { id: true },
        })
      : null,
    links.processId
      ? prisma.clientProcess.findFirst({
          where: { id: links.processId, clientId },
          select: { id: true },
        })
      : null,
  ]);

  if (links.projectId && !project) throw new Error("El proyecto no pertenece al cliente.");
  if (links.quoteId && !quote) throw new Error("La cotización no pertenece al cliente.");
  if (links.taxDocumentId && !taxDocument)
    throw new Error("El documento tributario no pertenece al cliente.");
  if (links.processId && !process) throw new Error("El expediente no pertenece al cliente.");
}

async function ensurePrivateBucket() {
  const { supabase } = createSupabaseServerClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(`No se pudo validar el almacenamiento: ${listError.message}`);

  if (!(buckets || []).some((bucket) => bucket.name === CLIENT_FILES_BUCKET)) {
    const { error } = await supabase.storage.createBucket(CLIENT_FILES_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_BYTES,
      allowedMimeTypes: [...ALLOWED_MIME_TYPES],
    });
    if (error && !error.message.toLowerCase().includes("already exists")) {
      throw new Error(`No se pudo crear el repositorio privado: ${error.message}`);
    }
  }

  return supabase;
}

export async function POST(req: Request, { params }: Context) {
  const auth = await requirePortalAdminApiSession();
  if ("error" in auth) return auth.error;

  let uploadedPath: string | null = null;
  try {
    const { id: clientId } = await params;
    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    let raw: Record<string, unknown>;
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const candidate = formData.get("file");
      file = candidate instanceof File ? candidate : null;
      raw = {
        title: formData.get("title"),
        description: formData.get("description"),
        category: formData.get("category"),
        fileName: file?.name || formData.get("fileName"),
        mimeType: file?.type || formData.get("mimeType"),
        fileSize: file?.size,
        projectId: formData.get("projectId"),
        quoteId: formData.get("quoteId"),
        taxDocumentId: formData.get("taxDocumentId"),
        processId: formData.get("processId"),
      };
    } else {
      raw = (await req.json()) as Record<string, unknown>;
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 },
      );
    }
    if (!file && !parsed.data.fileUrl) {
      return NextResponse.json(
        { error: "Debes adjuntar un archivo o indicar una URL válida." },
        { status: 400 },
      );
    }
    if (file && (file.size <= 0 || file.size > MAX_FILE_BYTES)) {
      return NextResponse.json(
        { error: "El archivo debe pesar entre 1 byte y 20 MB." },
        { status: 400 },
      );
    }
    if (file && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido." }, { status: 415 });
    }

    const client = await prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true, role: true },
    });
    if (!client || client.role !== "CLIENT") {
      return NextResponse.json({ error: "Cliente no encontrado." }, { status: 404 });
    }

    const links = {
      projectId: parsed.data.projectId || undefined,
      quoteId: parsed.data.quoteId || undefined,
      taxDocumentId: parsed.data.taxDocumentId || undefined,
      processId: parsed.data.processId || undefined,
    };
    await assertLinksBelongToClient(clientId, links);

    const documentId = randomUUID();
    let fileUrl = parsed.data.fileUrl || "";
    let storagePath: string | null = null;
    if (file) {
      const supabase = await ensurePrivateBucket();
      storagePath = `${clientId}/${new Date().getFullYear()}/${documentId}-${safeFileName(file.name)}`;
      uploadedPath = storagePath;
      const upload = await supabase.storage
        .from(CLIENT_FILES_BUCKET)
        .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
          contentType: file.type,
          upsert: false,
        });
      if (upload.error) throw new Error(`No se pudo subir el archivo: ${upload.error.message}`);
      fileUrl = `/api/portal/documents/${documentId}/download`;
    }

    const actorId = auth.legacy ? null : auth.session.user.id;
    const doc = await prisma.clientDocument.create({
      data: {
        id: documentId,
        userId: clientId,
        title: parsed.data.title,
        description: parsed.data.description || null,
        category: parsed.data.category.toUpperCase(),
        fileUrl,
        storagePath,
        fileName: parsed.data.fileName || file?.name || null,
        mimeType: parsed.data.mimeType || file?.type || null,
        fileSize: parsed.data.fileSize ?? file?.size,
        uploadedById: actorId,
        isPrivate: true,
        projectId: links.projectId,
        quoteId: links.quoteId,
        taxDocumentId: links.taxDocumentId,
        processId: links.processId,
      },
      select: { id: true },
    });

    await logPortalAdminAction({
      actorId,
      targetUserId: clientId,
      action: "ADMIN_CLIENT_DOCUMENT_CREATE",
      entityType: "ClientDocument",
      entityId: doc.id,
      details: {
        title: parsed.data.title,
        category: parsed.data.category,
        privateStorage: Boolean(storagePath),
        ...links,
      },
    });

    return NextResponse.json({ ok: true, id: doc.id });
  } catch (error) {
    if (uploadedPath) {
      try {
        const { supabase } = createSupabaseServerClient();
        await supabase.storage.from(CLIENT_FILES_BUCKET).remove([uploadedPath]);
      } catch {
        // La limpieza es best-effort; el error original conserva prioridad.
      }
    }
    const message = error instanceof Error ? error.message : "No se pudo registrar el documento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
