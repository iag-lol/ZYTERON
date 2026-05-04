import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getExpenseById, insertRow, updateRows } from "@/lib/admin/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ZYTERON_EXPENSE_BUCKET } from "@/lib/company";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function safeRedirectPath(value: unknown) {
  const path = typeof value === "string" ? value.trim() : "";
  if (!path.startsWith("/admin/gastos")) return "/admin/gastos";
  return path;
}

function buildRedirectUrl(request: Request, path: string) {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || "";
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "";
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const protocol = forwardedProto || requestUrl.protocol.replace(":", "");
  const origin = `${protocol}://${host}`;
  return new URL(path, origin);
}

function errorRedirect(request: Request, path: string, message: string) {
  const url = buildRedirectUrl(request, path);
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

function normalizeSupabaseUrl(rawUrl: string) {
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  const suffixes = ["/rest/v1", "/auth/v1", "/storage/v1"];
  const lowered = trimmed.toLowerCase();

  for (const suffix of suffixes) {
    if (lowered.endsWith(suffix)) {
      return trimmed.slice(0, -suffix.length);
    }
  }

  return trimmed;
}

function createSupabaseAnonServerClient() {
  const rawUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!rawUrl || !anonKey) {
    throw new Error(
      "Fallback anon no disponible. Define SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return createClient(normalizeSupabaseUrl(rawUrl), anonKey, {
    global: { headers: { "X-Client-Info": "zyteron-expense-fallback" } },
  });
}

async function saveExpenseWithAnonFallback(id: string, payload: Record<string, unknown>, currentExists: boolean) {
  const supabase = createSupabaseAnonServerClient();

  if (currentExists) {
    const { error } = await supabase.from("Expense").update(payload).eq("id", id);
    if (error) throw new Error(error.message || "No se pudo actualizar Expense en fallback anon.");
    return;
  }

  const { error } = await supabase.from("Expense").insert({ id, ...payload, createdAt: new Date().toISOString() });
  if (error) throw new Error(error.message || "No se pudo insertar Expense en fallback anon.");
}

async function ensureExpenseBucket() {
  const { supabase } = createSupabaseServerClient();
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
    return errorRedirect(request, redirectTo, "El nombre del gasto es obligatorio.");
  }

  const invoiceFile = formData.get("invoiceFile");
  const isFileProvided = invoiceFile instanceof File && invoiceFile.size > 0;
  if (isFileProvided && invoiceFile.size > MAX_UPLOAD_BYTES) {
    return errorRedirect(request, redirectTo, "El archivo adjunto supera 12MB.");
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
    try {
      await saveExpenseWithAnonFallback(id, payload, Boolean(current));
      warningMessage = warningMessage
        ? `${warningMessage} Guardado aplicado por fallback de permisos.`
        : "Guardado aplicado por fallback de permisos.";
    } catch (fallbackError) {
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "No se pudo guardar en fallback.";
      if (isRlsError(message) || isRlsError(fallbackMessage)) {
        return errorRedirect(
          request,
          redirectTo,
          "RLS bloqueó el guardado del gasto. Revisa políticas de Expense y storage.objects para permitir insert/update desde tu rol actual.",
        );
      }
      return errorRedirect(
        request,
        redirectTo,
        `No se pudo guardar el gasto: ${fallbackMessage}`,
      );
    }
  }

  const url = buildRedirectUrl(request, redirectTo);
  url.searchParams.set("saved", "1");
  if (warningMessage) {
    url.searchParams.set("warning", warningMessage);
  }
  return NextResponse.redirect(url, { status: 303 });
}
