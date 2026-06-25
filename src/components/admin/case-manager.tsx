"use client";

import { useState, useTransition } from "react";
import { FileText, ImagePlus, Loader2, PencilLine, PlusCircle, Save, Star, Trash2, X } from "lucide-react";

export type CaseStudyRow = {
  id: string;
  slug: string;
  companyName: string;
  industry: string | null;
  problem: string;
  solution: string;
  results: string | null;
  technologies: string[] | null;
  projectDuration: string | null;
  clientQuote: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  featured: boolean | null;
  sortOrder: number | null;
  status: string;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
};

type FormState = {
  id: string | null;
  companyName: string;
  slug: string;
  slugTouched: boolean;
  industry: string;
  problem: string;
  solution: string;
  results: string;
  technologies: string;
  projectDuration: string;
  clientQuote: string;
  imageUrl: string;
  imageAlt: string;
  featured: boolean;
  sortOrder: string;
  status: "draft" | "published";
  metaTitle: string;
  metaDescription: string;
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
  companyName: "",
  slug: "",
  slugTouched: false,
  industry: "",
  problem: "",
  solution: "",
  results: "",
  technologies: "",
  projectDuration: "",
  clientQuote: "",
  imageUrl: "",
  imageAlt: "",
  featured: false,
  sortOrder: "0",
  status: "draft",
  metaTitle: "",
  metaDescription: "",
  publishedAt: "",
  updatedAt: "",
};

export function CaseManager({ cases }: { cases: CaseStudyRow[] }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [alert, setAlert] = useState<Alert>({ type: "idle" });
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const isEditing = form.id !== null;
  const effectiveSlug = form.slugTouched ? form.slug : localSlugify(form.companyName);

  function resetForm() {
    setForm(EMPTY_FORM);
  }

  function editCase(item: CaseStudyRow) {
    setForm({
      id: item.id,
      companyName: item.companyName,
      slug: item.slug,
      slugTouched: true,
      industry: item.industry ?? "",
      problem: item.problem,
      solution: item.solution,
      results: item.results ?? "",
      technologies: (item.technologies ?? []).join(", "),
      projectDuration: item.projectDuration ?? "",
      clientQuote: item.clientQuote ?? "",
      imageUrl: item.imageUrl ?? "",
      imageAlt: item.imageAlt ?? "",
      featured: Boolean(item.featured),
      sortOrder: String(item.sortOrder ?? 0),
      status: item.status === "published" ? "published" : "draft",
      metaTitle: item.metaTitle ?? "",
      metaDescription: item.metaDescription ?? "",
      publishedAt: toDateInput(item.publishedAt),
      updatedAt: toDateInput(item.updatedAt),
    });
    setAlert({ type: "idle" });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImage(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/admin/casos/upload-image", { method: "POST", body: fd });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
    if (!res.ok || !data?.ok || !data.url) throw new Error(data?.error || "No se pudo subir la imagen.");
    return data.url;
  }

  async function handleImageFile(file: File) {
    setUploading(true);
    setAlert({ type: "idle" });
    try {
      const url = await uploadImage(file);
      setForm((p) => ({ ...p, imageUrl: url }));
      setAlert({ type: "success", message: "Imagen subida correctamente." });
    } catch (error) {
      setAlert({ type: "error", message: error instanceof Error ? error.message : "Error al subir imagen." });
    } finally {
      setUploading(false);
    }
  }

  function save(status: "draft" | "published") {
    const missing: string[] = [];
    if (!form.companyName.trim()) missing.push("empresa");
    if (!form.problem.trim()) missing.push("problema");
    if (!form.solution.trim()) missing.push("solución");
    if (missing.length > 0) {
      setAlert({ type: "error", message: `Campos obligatorios: ${missing.join(", ")}.` });
      return;
    }
    setAlert({ type: "idle" });
    startTransition(async () => {
      try {
        const res = await fetch("/admin/casos/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: isEditing ? "update" : "create",
            id: form.id ?? undefined,
            data: {
              companyName: form.companyName,
              slug: effectiveSlug,
              industry: form.industry,
              problem: form.problem,
              solution: form.solution,
              results: form.results,
              technologies: form.technologies,
              projectDuration: form.projectDuration,
              clientQuote: form.clientQuote,
              imageUrl: form.imageUrl,
              imageAlt: form.imageAlt,
              featured: form.featured,
              sortOrder: form.sortOrder,
              status,
              metaTitle: form.metaTitle,
              metaDescription: form.metaDescription,
              publishedAt: form.publishedAt,
              updatedAt: form.updatedAt,
            },
          }),
        });
        if (res.redirected && res.url.includes("/admin/login")) {
          throw new Error("Sesión admin expirada. Inicia sesión nuevamente.");
        }
        const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!res.ok || !data?.ok) throw new Error(data?.error || "No se pudo guardar el caso.");
        location.reload();
      } catch (error) {
        setAlert({ type: "error", message: error instanceof Error ? error.message : "Error inesperado." });
      }
    });
  }

  function remove(item: CaseStudyRow) {
    if (typeof window !== "undefined" && !window.confirm(`¿Eliminar el caso "${item.companyName}"?`)) return;
    startTransition(async () => {
      try {
        const res = await fetch("/admin/casos/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete", id: item.id }),
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
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Casos de éxito</h1>
          <p className="mt-1 text-sm text-slate-500">
            Documenta proyectos reales: problema, solución, resultados y testimonio. Se publican al sitio de inmediato.
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          {isEditing ? <PencilLine className="h-4 w-4 text-blue-600" /> : <PlusCircle className="h-4 w-4 text-blue-600" />}
          {isEditing ? "Editar caso" : "Nuevo caso"}
        </h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Nombre de la empresa *</label>
            <input
              className={inputClass}
              value={form.companyName}
              onChange={(e) => setForm((p) => ({ ...p, companyName: e.target.value }))}
              placeholder="Empresa de transporte XYZ"
            />
          </div>
          <div>
            <label className={labelClass}>Slug</label>
            <input
              className={inputClass}
              value={effectiveSlug}
              onChange={(e) => setForm((p) => ({ ...p, slug: localSlugify(e.target.value), slugTouched: true }))}
            />
            <p className="mt-1 text-[11px] text-slate-400">/casos-exito/{effectiveSlug || "…"}</p>
          </div>

          <div>
            <label className={labelClass}>Rubro / industria</label>
            <input
              className={inputClass}
              value={form.industry}
              onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
              placeholder="Transporte y logística"
            />
          </div>
          <div>
            <label className={labelClass}>Duración del proyecto</label>
            <input
              className={inputClass}
              value={form.projectDuration}
              onChange={(e) => setForm((p) => ({ ...p, projectDuration: e.target.value }))}
              placeholder="6 semanas"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Problema *</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.problem}
              onChange={(e) => setForm((p) => ({ ...p, problem: e.target.value }))}
              placeholder="¿Qué dolor operativo o comercial tenía el cliente?"
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Solución *</label>
            <textarea
              className={inputClass}
              rows={3}
              value={form.solution}
              onChange={(e) => setForm((p) => ({ ...p, solution: e.target.value }))}
              placeholder="¿Qué implementó Zyteron para resolverlo?"
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Resultados / métricas</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.results}
              onChange={(e) => setForm((p) => ({ ...p, results: e.target.value }))}
              placeholder='Ej. "Redujo el registro manual en 70%."'
            />
          </div>

          <div>
            <label className={labelClass}>Tecnologías (separadas por coma)</label>
            <input
              className={inputClass}
              value={form.technologies}
              onChange={(e) => setForm((p) => ({ ...p, technologies: e.target.value }))}
              placeholder="Next.js, Supabase, PostgreSQL"
            />
          </div>
          <div>
            <label className={labelClass}>Orden (menor aparece primero)</label>
            <input
              type="number"
              className={inputClass}
              value={form.sortOrder}
              onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Testimonio del cliente (opcional)</label>
            <textarea
              className={inputClass}
              rows={2}
              value={form.clientQuote}
              onChange={(e) => setForm((p) => ({ ...p, clientQuote: e.target.value }))}
            />
          </div>

          {/* Imagen */}
          <div>
            <label className={labelClass}>Imagen del caso *</label>
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
                    if (file) void handleImageFile(file);
                  }}
                />
              </label>
              {form.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.imageUrl} alt="Caso" className="h-12 w-20 rounded object-cover" />
              ) : (
                <span className="text-xs text-slate-400">Sin imagen</span>
              )}
            </div>
          </div>
          <div>
            <label className={labelClass}>Texto alternativo (alt) de la imagen</label>
            <input
              className={inputClass}
              value={form.imageAlt}
              onChange={(e) => setForm((p) => ({ ...p, imageAlt: e.target.value }))}
              placeholder="Describe la imagen para accesibilidad y SEO"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="featured"
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="featured" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
              <Star className="h-4 w-4 text-amber-500" /> Destacado en la home
            </label>
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
          <div className="md:col-span-2 rounded-xl border border-slate-100 bg-slate-50 p-4">
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
                <label className={labelClass}>Meta descripción</label>
                <input
                  className={inputClass}
                  value={form.metaDescription}
                  onChange={(e) => setForm((p) => ({ ...p, metaDescription: e.target.value }))}
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

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Casos en base de datos ({cases.length})</h2>
        {cases.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">
            Aún no hay casos en la base de datos. Crea el primero desde el formulario superior.
          </p>
        ) : (
          <div className="mt-3 divide-y divide-slate-100">
            {cases.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        item.status === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.status === "published" ? "Publicado" : "Borrador"}
                    </span>
                    {item.featured ? <Star className="h-3.5 w-3.5 text-amber-500" /> : null}
                    <p className="truncate text-sm font-semibold text-slate-900">{item.companyName}</p>
                  </div>
                  <p className="truncate text-xs text-slate-400">/casos-exito/{item.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editCase(item)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <PencilLine className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(item)}
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
