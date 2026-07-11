import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { siteConfig } from "@/config/site";
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogPostById,
  getBlogPostBySlug,
  slugify,
  estimateReadMinutes,
  type BlogPostWriteInput,
} from "@/lib/admin/blog-cases-repository";

const bodySchema = z.object({
  action: z.enum(["create", "update", "delete"]),
  id: z.string().trim().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function tagList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(/[,\n]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function intValue(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(text(value));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : fallback;
}

/**
 * Normaliza una fecha del formulario a ISO.
 * - Acepta "YYYY-MM-DD" (input date) y la guarda a mediodía UTC para evitar
 *   desfases de día al mostrarla.
 * - Devuelve null si viene vacía, o "invalid" si no es una fecha válida.
 */
function parseDateInput(value: unknown): string | null | "invalid" {
  const s = text(value);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T12:00:00.000Z`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "invalid" : d.toISOString();
}

/** Revalida todas las superficies públicas afectadas por un post. */
function revalidateBlog(slug?: string | null) {
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/sitemap.xml");
}

export async function POST(request: Request) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message || "Payload inválido" },
        { status: 400 },
      );
    }

    const { action, id, data = {} } = parsed.data;

    if (action === "delete") {
      if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });
      const existing = await getBlogPostById(id);
      await deleteBlogPost(id);
      revalidateBlog(existing?.slug);
      return NextResponse.json({ ok: true });
    }

    const title = text(data.title);
    if (!title) {
      return NextResponse.json({ ok: false, error: "El título es obligatorio." }, { status: 400 });
    }

    const content = text(data.content);
    if (!content) {
      return NextResponse.json({ ok: false, error: "El contenido es obligatorio." }, { status: 400 });
    }

    const slug = slugify(text(data.slug) || title);
    if (!slug) {
      return NextResponse.json({ ok: false, error: "No se pudo generar un slug válido." }, { status: 400 });
    }

    const status: "draft" | "published" =
      text(data.status).toLowerCase() === "published" ? "published" : "draft";

    const publishedAt = parseDateInput(data.publishedAt);
    const updatedAt = parseDateInput(data.updatedAt);
    if (publishedAt === "invalid" || updatedAt === "invalid") {
      return NextResponse.json({ ok: false, error: "Fecha inválida." }, { status: 400 });
    }

    const input: BlogPostWriteInput = {
      slug,
      title,
      excerpt: text(data.excerpt) || null,
      content,
      coverImageUrl: text(data.coverImageUrl) || null,
      coverImageAlt: text(data.coverImageAlt) || null,
      category: text(data.category) || null,
      tags: tagList(data.tags),
      readMinutes: intValue(data.readMinutes, estimateReadMinutes(content)),
      author: text(data.author) || siteConfig.representative.name,
      status,
      metaTitle: text(data.metaTitle) || null,
      metaDescription: text(data.metaDescription) || null,
      keywords: text(data.keywords) || null,
      ogImageUrl: text(data.ogImageUrl) || null,
      publishedAt,
      updatedAt,
    };

    // Verifica unicidad de slug (excluyendo el propio registro al editar).
    const slugOwner = await getBlogPostBySlug(slug);
    if (slugOwner && slugOwner.id !== id) {
      return NextResponse.json(
        { ok: false, error: `Ya existe un artículo con el slug "${slug}".` },
        { status: 409 },
      );
    }

    if (action === "create") {
      await createBlogPost(input);
    } else {
      if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });
      const existing = await getBlogPostById(id);
      if (!existing) return NextResponse.json({ ok: false, error: "Artículo no encontrado." }, { status: 404 });
      await updateBlogPost(id, input, existing.publishedAt);
      // Si cambió el slug, revalida también la ruta anterior.
      if (existing.slug && existing.slug !== slug) revalidateBlog(existing.slug);
    }

    revalidateBlog(slug);
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el artículo.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
