import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getExpenseById, insertRow, updateRows } from "@/lib/admin/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ZYTERON_EXPENSE_BUCKET } from "@/lib/company";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function safeRedirectPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/admin/gastos")) return "/admin/gastos";
  return path;
}

function errorRedirect(baseUrl: string, path: string, message: string) {
  const url = new URL(path, baseUrl);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url, { status: 303 });
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptional(value: unknown) {
  const cleaned = normalizeText(value);
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeAmount(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) return null;
  const parsed = Number(raw.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

function normalizeDate(value: unknown) {
  const raw = normalizeText(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeStatus(value: unknown) {
  const status = normalizeText(value).toUpperCase();
  if (status === "PURCHASED" || status === "CANCELLED") return status;
  return "PLANNED";
}

function normalizeFileName(name: string) {
  return name
    .trim()
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 100);
}

function isRlsError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("row-level security") || normalized.includes("violates row-level security policy");
}

async function ensureExpenseBucket() {
  const { supabase } = createSupabaseServerClient();
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`No se pudo verificar el bucket de gastos: ${listError.message}`);
  }

  const bucketExists = (buckets || []).some((bucket) => bucket.name === ZYTERON_EXPENSE_BUCKET);
  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(ZYTERON_EXPENSE_BUCKET, { public: true });
    if (createError && !createError.message.toLowerCase().includes("already exists")) {
      throw new Error(`No se pudo crear bucket de gastos: ${createError.message}`);
    }
  }

  return supabase;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const redirectTo = safeRedirectPath(formData.get("redirectTo"));
  const id = normalizeText(formData.get("id")) || randomUUID();
  const name = normalizeText(formData.get("name"));
  const category = normalizeText(formData.get("category")).toUpperCase() || "OTROS";
  const status = normalizeStatus(formData.get("status"));
  const description = normalizeOptional(formData.get("description"));
  const amount = normalizeAmount(formData.get("amount"));
  const store = normalizeOptional(formData.get("store"));
  const invoiceNumber = normalizeOptional(formData.get("invoiceNumber"));
  const purchaseDate = normalizeDate(formData.get("purchaseDate"));
  const arrivalDate = normalizeDate(formData.get("arrivalDate"));

  if (!name) {
    return errorRedirect(request.url, redirectTo, "El nombre del gasto es obligatorio.");
  }

  const invoiceFile = formData.get("invoiceFile");
  const isFileProvided = invoiceFile instanceof File && invoiceFile.size > 0;
  if (isFileProvided && invoiceFile.size > MAX_UPLOAD_BYTES) {
    return errorRedirect(request.url, redirectTo, "El archivo adjunto supera 12MB.");
  }

  let current = null;
  if (normalizeText(formData.get("id"))) {
    current = await getExpenseById(id);
  }

  let invoiceFileUrl = current?.invoiceFileUrl || null;
  let invoiceFilePath = current?.invoiceFilePath || null;
  let invoiceFileName = current?.invoiceFileName || null;
  let warningMessage: string | null = null;

  if (isFileProvided) {
    try {
      const fileBytes = Buffer.from(await invoiceFile.arrayBuffer());
      const cleanFileName = normalizeFileName(invoiceFile.name || "adjunto");
      const path = `expenses/${new Date().getFullYear()}/${id}/${Date.now()}-${cleanFileName}`;

      const supabase = await ensureExpenseBucket();
      const upload = await supabase.storage
        .from(ZYTERON_EXPENSE_BUCKET)
        .upload(path, fileBytes, {
          contentType: invoiceFile.type || "application/octet-stream",
          upsert: false,
        });

      if (upload.error) {
        const uploadMessage = String(upload.error.message || "Error desconocido al adjuntar archivo.");
        warningMessage = isRlsError(uploadMessage)
          ? "Gasto guardado sin adjunto: Storage bloqueó la subida por permisos RLS. Revisa políticas del bucket o la Service Role Key."
          : `Gasto guardado sin adjunto: ${uploadMessage}`;
      } else {
        const publicUrl = supabase.storage.from(ZYTERON_EXPENSE_BUCKET).getPublicUrl(path);
        invoiceFilePath = path;
        invoiceFileUrl = publicUrl.data.publicUrl || null;
        invoiceFileName = cleanFileName;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al adjuntar el archivo.";
      warningMessage = `Gasto guardado sin adjunto: ${message}`;
    }
  }

  const payload = {
    name,
    description,
    category,
    status,
    amount,
    store,
    invoiceNumber,
    purchaseDate,
    arrivalDate,
    invoiceFileUrl,
    invoiceFilePath,
    invoiceFileName,
    updatedAt: new Date().toISOString(),
  };

  try {
    if (current) {
      await updateRows("Expense", payload, { id });
    } else {
      await insertRow(
        "Expense",
        {
          id,
          ...payload,
          createdAt: new Date().toISOString(),
        },
        "id",
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el gasto.";
    return errorRedirect(request.url, redirectTo, message);
  }

  const url = new URL(redirectTo, request.url);
  url.searchParams.set("saved", "1");
  if (warningMessage) {
    url.searchParams.set("warning", warningMessage);
  }
  return NextResponse.redirect(url, { status: 303 });
}
