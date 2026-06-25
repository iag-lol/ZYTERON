"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, FileText, ImagePlus, Loader2, PencilLine, PlusCircle, Save, Trash2, X } from "lucide-react";
import { renderMarkdown } from "@/lib/markdown";

export type BlogPostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  category: string | null;
  tags: string[] | null;
  readMinutes: number | null;
  author: string | null;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  ogImageUrl: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
};

type FormState = {
  id: string | null;
  title: string;
  slug: string;
  slugTouched: boolean;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  coverImageAlt: string;
  category: string;
  tags: string;
  author: string;
  status: "draft" | "published";
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogImageUrl: string;
  publishedAt: string;
  updatedAt: string;
};

type Alert = { type: "idle" } | { type: "success" | "error"; message: string };

/** ISO almacenado (mediodía UTC) -> valor "YYYY-MM-DD" para un input date. */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function localSlugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  slug: "",
  slugTouched: false,
  excerpt: "",
  content: "",
  coverImageUrl: "",
  coverImageAlt: "",
  category: "",
  tags: "",
  author: "Zyteron",
  status: "draft",
  metaTitle: "",
  metaDescription: "",
  keywords: "",
  ogImageUrl: "",
  publishedAt: "",
  updatedAt: "",
};

export function BlogManager({ posts }: { posts: BlogPostRow[] }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [alert, setAlert] = useState<Alert>({ type: "idle" });
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const isEditing = form.id !== null;
  const effectiveSlug = form.slugTouched ? form.slug : localSlugify(form.title);
  const previewHtml = useMemo(() => renderMarkdown(form.content), [form.content]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setShowPreview(false);
  }

  function editPost(post: BlogPostRow) {
    setForm({
      id: post.id,
      title: post.title,
      slug: post.slug,
      slugTouched: true,
      excerpt: post.excerpt ?? "",
      content: post.content,
      coverImageUrl: post.coverImageUrl ?? "",
      coverImageAlt: post.coverImageAlt ?? "",
      category: post.category ?? "",
      tags: (post.tags ?? []).join(", "),
      author: post.author ?? "Zyteron",
      status: post.status === "published" ? "published" : "draft",
      metaTitle: post.metaTitle ?? "",
      metaDescription: post.metaDescription ?? "",
      keywords: post.keywords ?? "",
      ogImageUrl: post.ogImageUrl ?? "",
      publishedAt: toDateInput(post.publishedAt),
      updatedAt: toDateInput(post.updatedAt),
    });
    setAlert({ type: "idle" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/admin/blog/upload-image", { method: "POST", body: fd });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
    if (!res.ok || !data?.ok || !data.url) throw new Error(data?.error || "No se pudo subir la imagen.");
    return data.url;
  }

  async function handleCoverFile(file: File) {
    setUploading(true);
    setAlert({ type: "idle" });
    try {
      const url = await uploadImage(file);
      setForm((p) => ({ ...p, coverImageUrl: url }));
      setAlert({ type: "success", message: "Imagen subida correctamente." });
    } catch (error) {
      setAlert({ type: "error", message: error instanceof Error ? error.message : "Error al subir imagen." });
    } finally {
      setUploading(false);
    }
  }

  function save(status: "draft" | "published") {
    if (!form.title.trim()) {
      setAlert({ type: "error", message: "El título es obligatorio." });
      return;
    }
    if (!form.content.trim()) {
      setAlert({ type: "error", message: "El contenido es obligatorio." });
      return;
    }
    setAlert({ type: "idle" });
    startTransition(async () => {
      try {
        const res = await fetch("/admin/blog/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: isEditing ? "update" : "create",
            id: form.id ?? undefined,
            data: {
              title: form.title,
              slug: effectiveSlug,
              excerpt: form.excerpt,
              content: form.content,
              coverImageUrl: form.coverImageUrl,
              coverImageAlt: form.coverImageAlt,
              category: form.category,
              tags: form.tags,
              author: form.author,
              status,
              metaTitle: form.metaTitle,
              metaDescription: form.metaDescription,
              keywords: form.keywords,
              ogImageUrl: form.ogImageUrl,
              publishedAt: form.publishedAt,
              updatedAt: form.updatedAt,
            },
          }),
        });
        if (res.redirected && res.url.includes("/admin/login")) {
          throw new Error("Sesión admin expirada. Inicia sesión nuevamente.");
        }
        const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!res.ok || !data?.ok) throw new Error(data?.error || "No se pudo guardar el artículo.");
        location.reload();
      } catch (error) {
        setAlert({ type: "error", message: error instanceof Error ? error.message : "Error inesperado." });
      }
    });
  }

  function remove(post: BlogPostRow) {
    if (typeof window !== "undefined" && !window.confirm(`¿Eliminar el artículo "${post.title}"?`)) return;
    startTransition(async () => {
      try {
        const res = await fetch("/admin/blog/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", id: post.id }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!res.ok || !data?.ok) throw new Error(data?.error || "No se pudo eliminar.");
        location.reload();
      } catch (error) {
        setAlert({ type: "error", message: error instanceof Error ? error.message : "Error inesperado." });
      }
    });
  }

  const inputClass =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
  const labelClass = "block text-xs font-bold uppercase tracking-wide text-slate-500";

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Contenido</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Blog</h1>
          <p className="mt-1 text-sm text-slate-500">
            Crea y publica artículos. El contenido usa Markdown y se publica de inmediato al sitio.
          </p>
        </div>
        {isEditing ? (
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <X className="h-4 w-4" /> Cancelar edición
          </button>
        ) : null}
      </div>

      {alert.type !== "idle" ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            alert.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {alert.message}
        </div>
      ) : null}

      {/* Formulario */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          {isEditing ? <PencilLine className="h-4 w-4 text-blue-600" /> : <PlusCircle className="h-4 w-4 text-blue-600" />}
          {isEditing ? "Editar artículo" : "Nuevo artículo"}
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>Título *</label>
            <input
              className={inputClass}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="¿Cuánto cuesta una página web en Chile?"
            />
          </div>

          <div>
            <label className={labelClass}>Slug</label>
            <input
              className={inputClass}
              value={effectiveSlug}
              onChange={(e) => setForm((p) => ({ ...p, slug: localSlugify(e.target.value), slugTouched: true }))}
              placeholder="autogenerado-desde-el-titulo"
            />
            <p className="mt-1 text-[11px] text-slate-400">URL pública: /blog/{effectiveSlug || "…"}</p>
          </div>

          <div>
            <label className={labelClass}>Categoría</label>
            <input
              className={inputClass}
              value={form.category}
              onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              placeholder="Desarrollo web"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Extracto / bajada</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.excerpt}
              onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))}
              placeholder="Resumen breve que aparece en el listado y en los buscadores."
            />
          </div>

          {/* Contenido markdown + preview */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label className={labelClass}>Contenido (Markdown) *</label>
              <button
                type="button"
                onClick={() => setShowPreview((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <Eye className="h-3.5 w-3.5" /> {showPreview ? "Editar" : "Previsualizar"}
              </button>
            </div>
            {showPreview ? (
              <div
                className="blog-content mt-1 min-h-[220px] rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-800"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <textarea
                className={`${inputClass} font-mono`}
                rows={14}
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder={"## Subtítulo\n\nPárrafo de ejemplo con **negrita** y un [enlace](/contacto).\n\n- Punto 1\n- Punto 2"}
              />
            )}
          </div>

          {/* Portada */}
          <div>
            <label className={labelClass}>Imagen de portada</label>
            <div className="mt-1 flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                Subir
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleCoverFile(file);
                  }}
                />
              </label>
              {form.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.coverImageUrl} alt="Portada" className="h-12 w-20 rounded object-cover" />
              ) : (
                <span className="text-xs text-slate-400">Sin imagen</span>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Texto alternativo (alt) de la portada</label>
            <input
              className={inputClass}
              value={form.coverImageAlt}
              onChange={(e) => setForm((p) => ({ ...p, coverImageAlt: e.target.value }))}
              placeholder="Describe la imagen para accesibilidad y SEO"
            />
          </div>

          <div>
            <label className={labelClass}>Etiquetas (separadas por coma)</label>
            <input
              className={inputClass}
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              placeholder="pymes, seo, ecommerce"
            />
          </div>

          <div>
            <label className={labelClass}>Autor</label>
            <input
              className={inputClass}
              value={form.author}
              onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))}
            />
          </div>

          {/* Fechas de publicación */}
          <div className="md:col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fechas</p>
            <p className="mt-1 text-[11px] text-slate-400">
              Opcional. Si las dejas vacías, al publicar se usa la fecha de hoy. Útil si olvidaste publicar un día: elige la fecha que corresponde.
            </p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Fecha de publicación</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.publishedAt}
                  onChange={(e) => setForm((p) => ({ ...p, publishedAt: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Fecha de actualización</label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.updatedAt}
                  onChange={(e) => setForm((p) => ({ ...p, updatedAt: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* SEO */}
          <div className="md:col-span-2 mt-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">SEO</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Meta título</label>
                <input
                  className={inputClass}
                  value={form.metaTitle}
                  onChange={(e) => setForm((p) => ({ ...p, metaTitle: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelClass}>Keywords</label>
                <input
                  className={inputClass}
                  value={form.keywords}
                  onChange={(e) => setForm((p) => ({ ...p, keywords: e.target.value }))}
                  placeholder="opcional"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Meta descripción</label>
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.metaDescription}
                  onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Imagen OG (URL)</label>
                <input
                  className={inputClass}
                  value={form.ogImageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, ogImageUrl: e.target.value }))}
                  placeholder="Por defecto usa la portada"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => save("published")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Publicar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => save("draft")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <FileText className="h-4 w-4" /> Guardar borrador
          </button>
        </div>
      </section>

      {/* Listado */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Artículos en base de datos ({posts.length})</h2>
        {posts.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Aún no hay artículos en la base de datos. Crea el primero desde el formulario superior.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {posts.map((post) => (
              <div key={post.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        post.status === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {post.status === "published" ? "Publicado" : "Borrador"}
                    </span>
                    <p className="truncate text-sm font-semibold text-slate-900">{post.title}</p>
                  </div>
                  <p className="truncate text-xs text-slate-400">/blog/{post.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editPost(post)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <PencilLine className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(post)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
