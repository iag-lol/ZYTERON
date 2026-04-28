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

const bodySchema = z.object({
  action: z.enum(["create", "update", "delete"]),
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

function revalidateAll() {
  revalidatePath("/admin/productos");
  revalidatePath("/admin/control-web");
  revalidatePath("/productos");
  revalidatePath("/paquetes");
  revalidatePath("/");
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

    const row = {
      id: id || text(data.id) || randomUUID(),
      slug: text(data.slug).toLowerCase(),
      name: text(data.name),
      description: text(data.description),
      price: Math.max(0, Math.round(numberValue(data.price, 0))),
      discountPct: Math.max(0, Math.min(100, Math.round(numberValue(data.discountPct, 0)))),
      stock: Math.max(0, Math.round(numberValue(data.stock, 0))),
      featured: bool(data.featured, false),
      badges: stringList(data.badges),
      categoryId: text(data.categoryId),
      imageUrl: text(data.imageUrl) || null,
      publicDescription: text(data.publicDescription) || null,
      published: bool(data.published, true),
      status: text(data.status || "ACTIVE").toUpperCase(),
      soldUnits: Math.max(0, Math.round(numberValue(data.soldUnits, 0))),
      onOffer: bool(data.onOffer, false),
      isCombo: bool(data.isCombo, false),
      comboLabel: text(data.comboLabel) || null,
      notes: text(data.notes) || null,
    };

    if (!row.slug || !row.name || !row.description || row.price <= 0 || !row.categoryId) {
      return NextResponse.json(
        { ok: false, error: "Producto inválido: slug, nombre, descripción, precio y categoría son obligatorios." },
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
      notes: row.notes,
    });

    revalidateAll();
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el producto.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
