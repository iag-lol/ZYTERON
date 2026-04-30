import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  deleteProductAdminMetaBySlug,
  deleteProductPublicMetaBySlug,
  deleteRows,
  insertRow,
  upsertProductAdminMetaBySlug,
  upsertProductPublicMetaBySlug,
  updateRows,
} from "@/lib/admin/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  action: z.enum(["create", "update", "delete", "ensure_categories"]),
  id: z.string().trim().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
  }
  return fallback;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function stringList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [] as string[];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeDateTime(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function revalidateAll() {
  revalidatePath("/admin/productos");
  revalidatePath("/admin/control-web");
  revalidatePath("/productos");
  revalidatePath("/paquetes");
  revalidatePath("/");
}

const DEFAULT_PRODUCT_CATEGORIES = [
  { id: "cat-ti-notebooks", slug: "notebooks", name: "Notebooks", order: 10 },
  { id: "cat-ti-pcs", slug: "pc-escritorio", name: "PC Escritorio", order: 20 },
  { id: "cat-ti-combos", slug: "combos-empresa", name: "Combos Empresa", order: 30 },
  { id: "cat-ti-perifericos", slug: "perifericos", name: "Periféricos", order: 40 },
  { id: "cat-ti-redes", slug: "redes", name: "Redes y Conectividad", order: 50 },
];

async function ensureDefaultCategoriesInSupabase() {
  const { supabase } = createSupabaseServerClient();
  const { error } = await supabase
    .from("ProductCategory")
    .upsert(DEFAULT_PRODUCT_CATEGORIES, { onConflict: "slug" });
  if (error) {
    const message = String(error.message || "").toLowerCase();
    if (message.includes("row-level security policy")) {
      throw new Error(
        "RLS bloqueó ProductCategory. Verifica SUPABASE_SERVICE_ROLE_KEY (debe ser service role real) o crea políticas de insert/update para ProductCategory.",
      );
    }
    throw new Error(`No se pudieron crear categorías base: ${error.message}`);
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ ok: false, error: issue?.message || "Payload inválido" }, { status: 400 });
    }

    const { action, id, data = {} } = parsed.data;
    const now = new Date().toISOString();

    if (action === "ensure_categories") {
      await ensureDefaultCategoriesInSupabase();
      revalidateAll();
      return NextResponse.json({ ok: true });
    }

    if (action === "delete") {
      if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });
      const slug = text(data.slug);
      await deleteRows("Product", { id });
      if (slug) {
        await deleteProductPublicMetaBySlug(slug);
        await deleteProductAdminMetaBySlug(slug);
      }
      revalidateAll();
      return NextResponse.json({ ok: true });
    }

    const inputName = text(data.name);
    const inputPublicDescription = text(data.publicDescription);
    const inputDescription = text(data.description) || inputPublicDescription || (inputName ? `Producto ${inputName}` : "");
    const inputSlug = text(data.slug).toLowerCase() || slugify(inputName);

    let inputCategoryId = text(data.categoryId);
    if (!inputCategoryId) {
      await ensureDefaultCategoriesInSupabase();
      inputCategoryId = DEFAULT_PRODUCT_CATEGORIES[0].id;
    }

    const row = {
      id: id || text(data.id) || randomUUID(),
      slug: inputSlug,
      name: inputName,
      description: inputDescription,
      price: Math.max(0, Math.round(numberValue(data.price, 0))),
      discountPct: Math.max(0, Math.min(100, Math.round(numberValue(data.discountPct, 0)))),
      stock: Math.max(0, Math.round(numberValue(data.stock, 0))),
      featured: bool(data.featured, false),
      badges: stringList(data.badges),
      categoryId: inputCategoryId,
      imageUrl: text(data.imageUrl) || null,
      publicDescription: inputPublicDescription || null,
      published: bool(data.published, true),
      status: text(data.status || "ACTIVE").toUpperCase(),
      soldUnits: Math.max(0, Math.round(numberValue(data.soldUnits, 0))),
      onOffer: bool(data.onOffer, false),
      isCombo: bool(data.isCombo, false),
      comboLabel: text(data.comboLabel) || null,
      comboItems: stringList(data.comboItems),
      costPrice: Math.max(0, Math.round(numberValue(data.costPrice, 0))),
      discountStartsAt: text(data.discountStartsAt) || null,
      discountEndsAt: text(data.discountEndsAt) || null,
      notes: text(data.notes) || null,
    };

    if (row.discountStartsAt && Number.isNaN(new Date(row.discountStartsAt).getTime())) {
      return NextResponse.json({ ok: false, error: "Fecha de inicio de descuento inválida." }, { status: 400 });
    }
    if (row.discountEndsAt && Number.isNaN(new Date(row.discountEndsAt).getTime())) {
      return NextResponse.json({ ok: false, error: "Fecha de fin de descuento inválida." }, { status: 400 });
    }
    if (row.discountStartsAt && row.discountEndsAt) {
      const startsAt = new Date(row.discountStartsAt).getTime();
      const endsAt = new Date(row.discountEndsAt).getTime();
      if (startsAt > endsAt) {
        return NextResponse.json(
          { ok: false, error: "La fecha de inicio no puede ser mayor a la fecha de fin del descuento." },
          { status: 400 },
        );
      }
    }
    const normalizedDiscountStartsAt = normalizeDateTime(row.discountStartsAt);
    const normalizedDiscountEndsAt = normalizeDateTime(row.discountEndsAt);
    if (row.costPrice > row.price) {
      return NextResponse.json(
        { ok: false, error: "El costo no puede ser mayor al precio de venta del producto." },
        { status: 400 },
      );
    }

    if (!row.slug || !row.name || row.price <= 0 || !row.categoryId) {
      return NextResponse.json(
        { ok: false, error: "Producto inválido: slug/nombre, precio y categoría son obligatorios." },
        { status: 400 },
      );
    }

    if (action === "create") {
      await insertRow(
        "Product",
        {
          id: row.id,
          slug: row.slug,
          name: row.name,
          description: row.description,
          price: row.price,
          discountPct: row.discountPct,
          stock: row.stock,
          featured: row.featured,
          badges: row.badges,
          categoryId: row.categoryId,
          createdAt: now,
        },
        "id",
      );
    } else {
      if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });
      const previousSlug = text(data.previousSlug).toLowerCase();
      await updateRows(
        "Product",
        {
          slug: row.slug,
          name: row.name,
          description: row.description,
          price: row.price,
          discountPct: row.discountPct,
          stock: row.stock,
          featured: row.featured,
          badges: row.badges,
          categoryId: row.categoryId,
        },
        { id },
      );

      if (previousSlug && previousSlug !== row.slug) {
        await deleteProductPublicMetaBySlug(previousSlug);
        await deleteProductAdminMetaBySlug(previousSlug);
      }
    }

    await upsertProductPublicMetaBySlug(row.slug, {
      slug: row.slug,
      imageUrl: row.imageUrl,
      publicDescription: row.publicDescription,
      published: row.published,
    });

    await upsertProductAdminMetaBySlug(row.slug, {
      slug: row.slug,
      status: row.status,
      soldUnits: row.soldUnits,
      onOffer: row.onOffer,
      isCombo: row.isCombo,
      comboLabel: row.comboLabel,
      comboItems: row.comboItems,
      costPrice: row.costPrice,
      discountStartsAt: normalizedDiscountStartsAt,
      discountEndsAt: normalizedDiscountEndsAt,
      notes: row.notes,
    });

    revalidateAll();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el producto.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
