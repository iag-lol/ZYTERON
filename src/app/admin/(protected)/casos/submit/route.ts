import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  getCaseStudyById,
  getCaseStudyBySlug,
  slugify,
  type CaseStudyWriteInput,
} from "@/lib/admin/blog-cases-repository";

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
    const n = value.trim().toLowerCase();
    return n === "true" || n === "1" || n === "yes" || n === "on";
  }
  return fallback;
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
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

/**
 * Normaliza una fecha del formulario a ISO (mediodía UTC para "YYYY-MM-DD").
 * Devuelve null si viene vacía, o "invalid" si no es válida.
 */
function parseDateInput(value: unknown): string | null | "invalid" {
  const s = text(value);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T12:00:00.000Z`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "invalid" : d.toISOString();
}

function revalidateCases(slug?: string | null) {
  revalidatePath("/admin/casos");
  revalidatePath("/casos-exito");
  if (slug) revalidatePath(`/casos-exito/${slug}`);
  revalidatePath("/");
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
      const existing = await getCaseStudyById(id);
      await deleteCaseStudy(id);
      revalidateCases(existing?.slug);
      return NextResponse.json({ ok: true });
    }

    const companyName = text(data.companyName);
    const problem = text(data.problem);
    const solution = text(data.solution);
    const missing: string[] = [];
    if (!companyName) missing.push("empresa");
    if (!problem) missing.push("problema");
    if (!solution) missing.push("solución");
    if (missing.length > 0) {
      return NextResponse.json(
        { ok: false, error: `Campos obligatorios faltantes: ${missing.join(", ")}.` },
        { status: 400 },
      );
    }

    const slug = slugify(text(data.slug) || companyName);
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

    const input: CaseStudyWriteInput = {
      slug,
      companyName,
      industry: text(data.industry) || null,
      problem,
      solution,
      results: text(data.results) || null,
      technologies: tagList(data.technologies),
      projectDuration: text(data.projectDuration) || null,
      clientQuote: text(data.clientQuote) || null,
      imageUrl: text(data.imageUrl) || null,
      imageAlt: text(data.imageAlt) || null,
      featured: bool(data.featured),
      sortOrder: intValue(data.sortOrder, 0),
      status,
      metaTitle: text(data.metaTitle) || null,
      metaDescription: text(data.metaDescription) || null,
      publishedAt,
      updatedAt,
    };

    const slugOwner = await getCaseStudyBySlug(slug);
    if (slugOwner && slugOwner.id !== id) {
      return NextResponse.json(
        { ok: false, error: `Ya existe un caso con el slug "${slug}".` },
        { status: 409 },
      );
    }

    if (action === "create") {
      await createCaseStudy(input);
    } else {
      if (!id) return NextResponse.json({ ok: false, error: "ID requerido" }, { status: 400 });
      const existing = await getCaseStudyById(id);
      if (!existing) return NextResponse.json({ ok: false, error: "Caso no encontrado." }, { status: 404 });
      await updateCaseStudy(id, input, existing.publishedAt);
      if (existing.slug && existing.slug !== slug) revalidateCases(existing.slug);
    }

    revalidateCases(slug);
    return NextResponse.json({ ok: true, slug });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo guardar el caso.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
