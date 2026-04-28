import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
  deleteProductPublicMetaBySlug,
  deleteClientReviewById,
  deleteRows,
  upsertProductPublicMetaBySlug,
  insertRow,
  setClientReviewStatus,
  upsertSetting,
  updateRows,
} from "@/lib/admin/repository";

const bodySchema = z.object({
  section: z.enum(["plan", "extra", "product", "discount", "review"]),
  action: z.enum(["create", "update", "delete", "approve", "reject", "pending"]),
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

function toIsoDate(value: unknown) {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsed = bodySchema.safeParse(payload);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue?.message || "Payload inválido" }, { status: 400 });
    }

    const { section, action, id, data = {} } = parsed.data;
    const now = new Date().toISOString();

    if (section === "plan") {
      if (action === "delete") {
        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        const slug = text(data.slug);
        await deleteRows("Plan", { id });
        if (slug) {
          await deleteRows("Setting", { key: `plan_not_included_${slug}` });
        }
        revalidatePath("/planes");
        revalidatePath("/paquetes");
        revalidatePath("/");
        return NextResponse.json({ ok: true });
      }

      const row = {
        id: id || text(data.id) || randomUUID(),
        slug: text(data.slug),
        name: text(data.name),
        description: text(data.description),
        price: Math.max(0, Math.round(numberValue(data.price, 0))),
        tier: text(data.tier || "BASIC").toUpperCase(),
        popular: bool(data.popular, false),
        features: stringList(data.features),
        freeGifts: stringList(data.freeGifts),
      };

      if (!row.slug || !row.name || row.price <= 0) {
        return NextResponse.json({ error: "Plan inválido: slug, nombre y precio son obligatorios." }, { status: 400 });
      }

      if (action === "create") {
        await insertRow("Plan", row, "id");
        const notIncluded = stringList(data.notIncluded);
        await upsertSetting({
          key: `plan_not_included_${row.slug}`,
          value: JSON.stringify(notIncluded),
          type: "JSON",
        });
      } else {
        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        const previousSlug = text(data.previousSlug);
        await updateRows(
          "Plan",
          {
            slug: row.slug,
            name: row.name,
            description: row.description,
            price: row.price,
            tier: row.tier,
            popular: row.popular,
            features: row.features,
            freeGifts: row.freeGifts,
          },
          { id },
        );
        if (previousSlug && previousSlug !== row.slug) {
          await deleteRows("Setting", { key: `plan_not_included_${previousSlug}` });
        }
        const notIncluded = stringList(data.notIncluded);
        await upsertSetting({
          key: `plan_not_included_${row.slug}`,
          value: JSON.stringify(notIncluded),
          type: "JSON",
        });
      }

      revalidatePath("/planes");
      revalidatePath("/paquetes");
      revalidatePath("/");
      return NextResponse.json({ ok: true });
    }

    if (section === "extra") {
      if (action === "delete") {
        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        await deleteRows("Extra", { id });
        revalidatePath("/paquetes");
        return NextResponse.json({ ok: true });
      }

      const row = {
        id: id || text(data.id) || randomUUID(),
        slug: text(data.slug),
        name: text(data.name),
        category: text(data.category || "TECH").toUpperCase(),
        description: text(data.description),
        options: stringList(data.options),
        price: Math.max(0, Math.round(numberValue(data.price, 0))),
      };

      if (!row.slug || !row.name || !row.description || row.price <= 0) {
        return NextResponse.json({ error: "Extra inválido: slug, nombre, descripción y precio son obligatorios." }, { status: 400 });
      }

      if (action === "create") {
        await insertRow("Extra", row, "id");
      } else {
        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        await updateRows(
          "Extra",
          {
            slug: row.slug,
            name: row.name,
            category: row.category,
            description: row.description,
            options: row.options,
            price: row.price,
          },
          { id },
        );
      }

      revalidatePath("/paquetes");
      return NextResponse.json({ ok: true });
    }

    if (section === "product") {
      if (action === "delete") {
        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        const slug = text(data.slug);
        await deleteRows("Product", { id });
        if (slug) {
          await deleteProductPublicMetaBySlug(slug);
        }
        revalidatePath("/productos");
        revalidatePath("/paquetes");
        revalidatePath("/planes");
        return NextResponse.json({ ok: true });
      }

      const row = {
        id: id || text(data.id) || randomUUID(),
        slug: text(data.slug),
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
      };

      if (!row.slug || !row.name || !row.description || row.price <= 0 || !row.categoryId) {
        return NextResponse.json(
          { error: "Producto inválido: slug, nombre, descripción, precio y categoryId son obligatorios." },
          { status: 400 },
        );
      }

      if (action === "create") {
        await insertRow(
          "Product",
          {
            ...row,
            createdAt: now,
          },
          "id",
        );
        await upsertProductPublicMetaBySlug(row.slug, {
          slug: row.slug,
          imageUrl: row.imageUrl,
          publicDescription: row.publicDescription,
          published: row.published,
        });
      } else {
        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        const previousSlug = text(data.previousSlug);
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
        }
        await upsertProductPublicMetaBySlug(row.slug, {
          slug: row.slug,
          imageUrl: row.imageUrl,
          publicDescription: row.publicDescription,
          published: row.published,
        });
      }

      revalidatePath("/productos");
      revalidatePath("/paquetes");
      revalidatePath("/planes");
      revalidatePath("/");
      return NextResponse.json({ ok: true });
    }

    if (section === "discount") {
      if (action === "delete") {
        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        await deleteRows("WebDiscount", { id });
        revalidatePath("/paquetes");
        return NextResponse.json({ ok: true });
      }

      const row = {
        id: id || text(data.id) || randomUUID(),
        name: text(data.name),
        description: text(data.description),
        targetType: text(data.targetType || "ORDER").toUpperCase(),
        targetId: text(data.targetId) || null,
        mode: text(data.mode || "PERCENT").toUpperCase(),
        value: Math.max(0, Math.round(numberValue(data.value, 0))),
        minSubtotal: Math.max(0, Math.round(numberValue(data.minSubtotal, 0))),
        active: bool(data.active, true),
        startsAt: toIsoDate(data.startsAt),
        endsAt: toIsoDate(data.endsAt),
      };

      if (!row.name || row.value <= 0) {
        return NextResponse.json({ error: "Descuento inválido: nombre y valor son obligatorios." }, { status: 400 });
      }

      if (action === "create") {
        await insertRow(
          "WebDiscount",
          {
            ...row,
            createdAt: now,
            updatedAt: now,
          },
          "id",
        );
      } else {
        if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
        await updateRows(
          "WebDiscount",
          {
            name: row.name,
            description: row.description,
            targetType: row.targetType,
            targetId: row.targetId,
            mode: row.mode,
            value: row.value,
            minSubtotal: row.minSubtotal,
            active: row.active,
            startsAt: row.startsAt,
            endsAt: row.endsAt,
            updatedAt: now,
          },
          { id },
        );
      }

      revalidatePath("/paquetes");
      return NextResponse.json({ ok: true });
    }

    if (section === "review") {
      if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
      if (action === "delete") {
        await deleteClientReviewById(id);
        revalidatePath("/admin/comentarios");
        revalidatePath("/");
        return NextResponse.json({ ok: true });
      }
      if (action === "approve") {
        await setClientReviewStatus(id, "APPROVED");
        revalidatePath("/admin/comentarios");
        revalidatePath("/");
        return NextResponse.json({ ok: true });
      }
      if (action === "reject") {
        await setClientReviewStatus(id, "REJECTED");
        revalidatePath("/admin/comentarios");
        revalidatePath("/");
        return NextResponse.json({ ok: true });
      }
      if (action === "pending") {
        await setClientReviewStatus(id, "PENDING");
        revalidatePath("/admin/comentarios");
        revalidatePath("/");
        return NextResponse.json({ ok: true });
      }
    }

    return NextResponse.json({ error: "Operación no soportada." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error inesperado en Control Web.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
