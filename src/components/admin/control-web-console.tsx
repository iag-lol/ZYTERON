"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldCheck, Trash2, X } from "lucide-react";
import type { ClientReview, ExtraRecord, PlanRecord, ProductCategoryRecord, ProductRecord, WebDiscount } from "@/lib/admin/repository";

type Props = {
  plans: PlanRecord[];
  extras: ExtraRecord[];
  products: ProductRecord[];
  productCategories: ProductCategoryRecord[];
  discounts: WebDiscount[];
  reviews: ClientReview[];
  planNotIncludedBySlug: Record<string, string[]>;
};

type AlertState =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

type NewPlan = {
  slug: string;
  name: string;
  description: string;
  price: string;
  tier: "BASIC" | "INTERMEDIATE" | "PRO";
  popular: boolean;
  features: string;
  gifts: string;
  notIncluded: string;
};

type NewExtra = {
  slug: string;
  name: string;
  category: string;
  description: string;
  price: string;
  options: string;
};

type NewProduct = {
  slug: string;
  name: string;
  description: string;
  price: string;
  discountPct: string;
  stock: string;
  featured: boolean;
  badges: string;
  categoryId: string;
};

type NewDiscount = {
  name: string;
  description: string;
  targetType: "ORDER" | "PLAN" | "EXTRA" | "PRODUCT";
  targetId: string;
  mode: "PERCENT" | "FIXED";
  value: string;
  minSubtotal: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

const textareaClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-y";

const buttonClass =
  "inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors";

function parseTextRows(text?: string[] | null) {
  return Array.isArray(text) ? text.join("\n") : "";
}

function toMoneyValue(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortReviews(reviews: ClientReview[]) {
  return reviews
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function ControlWebConsole({
  plans,
  extras,
  products,
  productCategories,
  discounts,
  reviews,
  planNotIncludedBySlug,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [alert, setAlert] = useState<AlertState>({ type: "idle" });

  const [planRows, setPlanRows] = useState(
    plans.map((plan) => ({
      ...plan,
      originalSlug: plan.slug,
      price: String(plan.price ?? 0),
      featuresText: parseTextRows(plan.features),
      giftsText: parseTextRows(plan.freeGifts),
      notIncludedText: (planNotIncludedBySlug[plan.slug] || []).join("\n"),
    })),
  );
  const [extraRows, setExtraRows] = useState(
    extras.map((extra) => ({
      ...extra,
      price: String(extra.price ?? 0),
      optionsText: parseTextRows(extra.options),
    })),
  );
  const [productRows, setProductRows] = useState(
    products.map((product) => ({
      ...product,
      price: String(product.price ?? 0),
      discountPct: String(product.discountPct ?? 0),
      stock: String(product.stock ?? 0),
      badgesText: parseTextRows(product.badges),
    })),
  );
  const [discountRows, setDiscountRows] = useState(
    discounts.map((discount) => ({
      ...discount,
      value: String(discount.value ?? 0),
      minSubtotal: String(discount.minSubtotal ?? 0),
      startsAt: discount.startsAt ? String(discount.startsAt).slice(0, 16) : "",
      endsAt: discount.endsAt ? String(discount.endsAt).slice(0, 16) : "",
    })),
  );
  const reviewRows = useMemo(() => sortReviews(reviews), [reviews]);

  const [newPlan, setNewPlan] = useState<NewPlan>({
    slug: "",
    name: "",
    description: "",
    price: "",
    tier: "BASIC",
    popular: false,
    features: "",
    gifts: "",
    notIncluded: "",
  });
  const [newExtra, setNewExtra] = useState<NewExtra>({
    slug: "",
    name: "",
    category: "TECH",
    description: "",
    price: "",
    options: "",
  });
  const [newProduct, setNewProduct] = useState<NewProduct>({
    slug: "",
    name: "",
    description: "",
    price: "",
    discountPct: "0",
    stock: "10",
    featured: false,
    badges: "",
    categoryId: productCategories[0]?.id || "",
  });
  const [newDiscount, setNewDiscount] = useState<NewDiscount>({
    name: "",
    description: "",
    targetType: "ORDER",
    targetId: "",
    mode: "PERCENT",
    value: "",
    minSubtotal: "0",
    active: true,
    startsAt: "",
    endsAt: "",
  });
  const [productSearch, setProductSearch] = useState("");

  const targets = useMemo(() => {
    const allTargets = [
      ...planRows.map((item) => ({ id: item.id, name: `Plan: ${item.name}` })),
      ...extraRows.map((item) => ({ id: item.id, name: `Extra: ${item.name}` })),
      ...productRows.map((item) => ({ id: item.id, name: `Producto: ${item.name}` })),
    ];
    return allTargets;
  }, [extraRows, planRows, productRows]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return productRows;
    return productRows.filter((product) => {
      const haystack = `${product.slug} ${product.name} ${product.description || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [productRows, productSearch]);

  function updateProductRow(id: string, patch: Record<string, unknown>) {
    setProductRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  async function submitControl(body: Record<string, unknown>) {
    const response = await fetch("/admin/control-web/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "No se pudo guardar el cambio.");
    }
  }

  function runWithFeedback(
    action: () => Promise<void>,
    successMessage: string,
  ) {
    setAlert({ type: "idle" });
    startTransition(async () => {
      try {
        await action();
        setAlert({ type: "success", message: successMessage });
        router.refresh();
      } catch (error) {
        setAlert({
          type: "error",
          message: error instanceof Error ? error.message : "Error inesperado.",
        });
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Control Web</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Productos, precios, descuentos y reseñas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Gestiona contenido comercial en tiempo real para las secciones públicas del sitio.
        </p>
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
        <h2 className="text-base font-bold text-slate-900">Planes</h2>
        <p className="mt-1 text-xs text-slate-500">Edita plan base, precio y beneficios.</p>

        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-6">
          <input className={inputClass} placeholder="slug" value={newPlan.slug} onChange={(e) => setNewPlan((p) => ({ ...p, slug: e.target.value }))} />
          <input className={inputClass} placeholder="nombre" value={newPlan.name} onChange={(e) => setNewPlan((p) => ({ ...p, name: e.target.value }))} />
          <input className={inputClass} placeholder="descripción" value={newPlan.description} onChange={(e) => setNewPlan((p) => ({ ...p, description: e.target.value }))} />
          <input className={inputClass} placeholder="precio" value={newPlan.price} onChange={(e) => setNewPlan((p) => ({ ...p, price: e.target.value }))} />
          <select className={inputClass} value={newPlan.tier} onChange={(e) => setNewPlan((p) => ({ ...p, tier: e.target.value as NewPlan["tier"] }))}>
            <option value="BASIC">BASIC</option>
            <option value="INTERMEDIATE">INTERMEDIATE</option>
            <option value="PRO">PRO</option>
          </select>
          <button
            className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
            disabled={isPending}
            onClick={() =>
              runWithFeedback(
                () =>
                  submitControl({
                    section: "plan",
                    action: "create",
                    data: {
                      ...newPlan,
                      freeGifts: newPlan.gifts,
                    },
                  }),
                "Plan creado.",
              )
            }
            type="button"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear plan"}
          </button>
          <textarea
            className={`${textareaClass} lg:col-span-2`}
            rows={3}
            value={newPlan.features}
            placeholder="Qué incluye (una línea por item)"
            onChange={(e) => setNewPlan((p) => ({ ...p, features: e.target.value }))}
          />
          <textarea
            className={`${textareaClass} lg:col-span-2`}
            rows={3}
            value={newPlan.gifts}
            placeholder="Beneficios/regalos (una línea por item)"
            onChange={(e) => setNewPlan((p) => ({ ...p, gifts: e.target.value }))}
          />
          <textarea
            className={`${textareaClass} lg:col-span-2`}
            rows={3}
            value={newPlan.notIncluded}
            placeholder="No incluye (una línea por item)"
            onChange={(e) => setNewPlan((p) => ({ ...p, notIncluded: e.target.value }))}
          />
        </div>

        <div className="mt-4 space-y-3">
          {planRows.map((plan, index) => (
            <div key={plan.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 xl:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
              <input className={inputClass} value={plan.slug} onChange={(e) => setPlanRows((rows) => rows.map((row, i) => (i === index ? { ...row, slug: e.target.value } : row)))} />
              <input className={inputClass} value={plan.name} onChange={(e) => setPlanRows((rows) => rows.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} />
              <input className={inputClass} value={plan.description || ""} onChange={(e) => setPlanRows((rows) => rows.map((row, i) => (i === index ? { ...row, description: e.target.value } : row)))} />
              <input className={inputClass} value={plan.price} onChange={(e) => setPlanRows((rows) => rows.map((row, i) => (i === index ? { ...row, price: e.target.value } : row)))} />
              <select className={inputClass} value={String(plan.tier || "BASIC")} onChange={(e) => setPlanRows((rows) => rows.map((row, i) => (i === index ? { ...row, tier: e.target.value } : row)))}>
                <option value="BASIC">BASIC</option>
                <option value="INTERMEDIATE">INTERMEDIATE</option>
                <option value="PRO">PRO</option>
              </select>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(plan.popular)}
                  onChange={(e) => setPlanRows((rows) => rows.map((row, i) => (i === index ? { ...row, popular: e.target.checked } : row)))}
                />
                Popular
              </label>
              <div className="flex items-start gap-2 xl:row-span-2">
                <button
                  type="button"
                  className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
                  onClick={() =>
                    runWithFeedback(
                      () =>
                        submitControl({
                          section: "plan",
                          action: "update",
                          id: plan.id,
                          data: {
                            ...plan,
                            features: plan.featuresText,
                            freeGifts: plan.giftsText,
                            notIncluded: plan.notIncludedText,
                            previousSlug: plan.originalSlug,
                          },
                        }),
                      "Plan actualizado.",
                    )
                  }
                  disabled={isPending}
                >
                  <Check className="h-3.5 w-3.5" />
                  Guardar
                </button>
                <button
                  type="button"
                  className={`${buttonClass} bg-rose-100 text-rose-700 hover:bg-rose-200`}
                  onClick={() =>
                    runWithFeedback(
                      () =>
                        submitControl({
                          section: "plan",
                          action: "delete",
                          id: plan.id,
                          data: { slug: plan.slug },
                        }),
                      "Plan eliminado.",
                    )
                  }
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </div>

              <textarea
                className={`${textareaClass} xl:col-span-3`}
                rows={3}
                value={plan.featuresText}
                placeholder="Features (una línea por item)"
                onChange={(e) => setPlanRows((rows) => rows.map((row, i) => (i === index ? { ...row, featuresText: e.target.value } : row)))}
              />
              <textarea
                className={`${textareaClass} xl:col-span-3`}
                rows={3}
                value={plan.giftsText}
                placeholder="Regalos/beneficios (una línea por item)"
                onChange={(e) => setPlanRows((rows) => rows.map((row, i) => (i === index ? { ...row, giftsText: e.target.value } : row)))}
              />
              <textarea
                className={`${textareaClass} xl:col-span-6`}
                rows={2}
                value={plan.notIncludedText}
                placeholder="No incluye (una línea por item)"
                onChange={(e) =>
                  setPlanRows((rows) =>
                    rows.map((row, i) =>
                      i === index ? { ...row, notIncludedText: e.target.value } : row,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Extras</h2>
        <p className="mt-1 text-xs text-slate-500">Configura extras del cotizador y sus precios.</p>

        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-6">
          <input className={inputClass} placeholder="slug" value={newExtra.slug} onChange={(e) => setNewExtra((p) => ({ ...p, slug: e.target.value }))} />
          <input className={inputClass} placeholder="nombre" value={newExtra.name} onChange={(e) => setNewExtra((p) => ({ ...p, name: e.target.value }))} />
          <select className={inputClass} value={newExtra.category} onChange={(e) => setNewExtra((p) => ({ ...p, category: e.target.value }))}>
            {["DOMAIN", "EMAIL", "SEO", "SUPPORT", "TECH", "DESIGN", "EQUIPMENT", "TRAINING"].map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <input className={inputClass} placeholder="precio" value={newExtra.price} onChange={(e) => setNewExtra((p) => ({ ...p, price: e.target.value }))} />
          <input className={inputClass} placeholder="descripción" value={newExtra.description} onChange={(e) => setNewExtra((p) => ({ ...p, description: e.target.value }))} />
          <button
            className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
            disabled={isPending}
            onClick={() =>
              runWithFeedback(
                () =>
                  submitControl({
                    section: "extra",
                    action: "create",
                    data: {
                      ...newExtra,
                      options: newExtra.options,
                    },
                  }),
                "Extra creado.",
              )
            }
            type="button"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear extra"}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {extraRows.map((extra, index) => (
            <div key={extra.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 xl:grid-cols-[repeat(6,minmax(0,1fr))_auto]">
              <input className={inputClass} value={extra.slug} onChange={(e) => setExtraRows((rows) => rows.map((row, i) => (i === index ? { ...row, slug: e.target.value } : row)))} />
              <input className={inputClass} value={extra.name} onChange={(e) => setExtraRows((rows) => rows.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} />
              <select className={inputClass} value={String(extra.category || "TECH")} onChange={(e) => setExtraRows((rows) => rows.map((row, i) => (i === index ? { ...row, category: e.target.value } : row)))}>
                {["DOMAIN", "EMAIL", "SEO", "SUPPORT", "TECH", "DESIGN", "EQUIPMENT", "TRAINING"].map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <input className={inputClass} value={extra.price} onChange={(e) => setExtraRows((rows) => rows.map((row, i) => (i === index ? { ...row, price: e.target.value } : row)))} />
              <input className={inputClass} value={extra.description || ""} onChange={(e) => setExtraRows((rows) => rows.map((row, i) => (i === index ? { ...row, description: e.target.value } : row)))} />
              <textarea
                className={textareaClass}
                rows={2}
                value={extra.optionsText}
                onChange={(e) => setExtraRows((rows) => rows.map((row, i) => (i === index ? { ...row, optionsText: e.target.value } : row)))}
                placeholder="Opciones (una línea por item)"
              />
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
                  onClick={() =>
                    runWithFeedback(
                      () =>
                        submitControl({
                          section: "extra",
                          action: "update",
                          id: extra.id,
                          data: {
                            ...extra,
                            options: extra.optionsText,
                          },
                        }),
                      "Extra actualizado.",
                    )
                  }
                  disabled={isPending}
                >
                  <Check className="h-3.5 w-3.5" />
                  Guardar
                </button>
                <button
                  type="button"
                  className={`${buttonClass} bg-rose-100 text-rose-700 hover:bg-rose-200`}
                  onClick={() =>
                    runWithFeedback(
                      () =>
                        submitControl({
                          section: "extra",
                          action: "delete",
                          id: extra.id,
                        }),
                      "Extra eliminado.",
                    )
                  }
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Productos</h2>
        <p className="mt-1 text-xs text-slate-500">Edita los productos ya creados en la web: nombre, precio, observaciones, stock y descuentos.</p>

        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-8">
          <input className={inputClass} placeholder="slug" value={newProduct.slug} onChange={(e) => setNewProduct((p) => ({ ...p, slug: e.target.value }))} />
          <input className={inputClass} placeholder="nombre" value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} />
          <input className={inputClass} placeholder="descripción" value={newProduct.description} onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))} />
          <input className={inputClass} placeholder="precio" value={newProduct.price} onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))} />
          <input className={inputClass} placeholder="desc. %" value={newProduct.discountPct} onChange={(e) => setNewProduct((p) => ({ ...p, discountPct: e.target.value }))} />
          <input className={inputClass} placeholder="stock" value={newProduct.stock} onChange={(e) => setNewProduct((p) => ({ ...p, stock: e.target.value }))} />
          <select className={inputClass} value={newProduct.categoryId} onChange={(e) => setNewProduct((p) => ({ ...p, categoryId: e.target.value }))}>
            {productCategories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <button
            className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
            disabled={isPending}
            onClick={() =>
              runWithFeedback(
                () =>
                  submitControl({
                    section: "product",
                    action: "create",
                    data: {
                      ...newProduct,
                      badges: newProduct.badges,
                    },
                  }),
                "Producto creado.",
              )
            }
            type="button"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear"}
          </button>
          <textarea className={`${textareaClass} lg:col-span-8`} rows={2} placeholder="Badges (una línea por item)" value={newProduct.badges} onChange={(e) => setNewProduct((p) => ({ ...p, badges: e.target.value }))} />
        </div>

        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            className={`${inputClass} sm:max-w-sm`}
            placeholder="Buscar producto por nombre, slug u observación"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
          />
          <p className="text-xs font-semibold text-slate-500">
            Mostrando {filteredProducts.length} de {productRows.length} productos
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {filteredProducts.map((product) => (
            <div key={product.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 xl:grid-cols-[repeat(8,minmax(0,1fr))_auto]">
              <input className={inputClass} value={product.slug} onChange={(e) => updateProductRow(product.id, { slug: e.target.value })} />
              <input className={inputClass} value={product.name} onChange={(e) => updateProductRow(product.id, { name: e.target.value })} />
              <input className={inputClass} value={product.price} onChange={(e) => updateProductRow(product.id, { price: e.target.value })} />
              <input className={inputClass} value={product.discountPct} onChange={(e) => updateProductRow(product.id, { discountPct: e.target.value })} />
              <input className={inputClass} value={product.stock} onChange={(e) => updateProductRow(product.id, { stock: e.target.value })} />
              <select className={inputClass} value={String(product.categoryId || "")} onChange={(e) => updateProductRow(product.id, { categoryId: e.target.value })}>
                {productCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(product.featured)}
                  onChange={(e) => updateProductRow(product.id, { featured: e.target.checked })}
                />
                Destacado
              </label>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-900">
                <p className="font-semibold">Precio final web</p>
                <p>
                  {formatMoney(
                    toMoneyValue(product.price) *
                      (1 - Math.min(100, Math.max(0, toMoneyValue(product.discountPct))) / 100),
                  )}
                </p>
              </div>
              <textarea
                className={`${textareaClass} xl:col-span-8`}
                rows={2}
                value={product.description || ""}
                placeholder="Observaciones / descripción pública"
                onChange={(e) => updateProductRow(product.id, { description: e.target.value })}
              />
              <textarea
                className={`${textareaClass} xl:col-span-8`}
                rows={2}
                value={product.badgesText}
                placeholder="Badges (una línea por item)"
                onChange={(e) => updateProductRow(product.id, { badgesText: e.target.value })}
              />
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
                  onClick={() =>
                    runWithFeedback(
                      () =>
                        submitControl({
                          section: "product",
                          action: "update",
                          id: product.id,
                          data: {
                            ...product,
                            badges: product.badgesText,
                          },
                        }),
                      "Producto actualizado.",
                    )
                  }
                  disabled={isPending}
                >
                  <Check className="h-3.5 w-3.5" />
                  Guardar
                </button>
                <button
                  type="button"
                  className={`${buttonClass} bg-rose-100 text-rose-700 hover:bg-rose-200`}
                  onClick={() =>
                    runWithFeedback(
                      () =>
                        submitControl({
                          section: "product",
                          action: "delete",
                          id: product.id,
                        }),
                      "Producto eliminado.",
                    )
                  }
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Descuentos</h2>
        <p className="mt-1 text-xs text-slate-500">Crea descuentos por plan, extra o pedido completo.</p>

        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-10">
          <input className={inputClass} placeholder="Nombre" value={newDiscount.name} onChange={(e) => setNewDiscount((p) => ({ ...p, name: e.target.value }))} />
          <input className={inputClass} placeholder="Descripción" value={newDiscount.description} onChange={(e) => setNewDiscount((p) => ({ ...p, description: e.target.value }))} />
          <select className={inputClass} value={newDiscount.targetType} onChange={(e) => setNewDiscount((p) => ({ ...p, targetType: e.target.value as NewDiscount["targetType"] }))}>
            <option value="ORDER">ORDER</option>
            <option value="PLAN">PLAN</option>
            <option value="EXTRA">EXTRA</option>
            <option value="PRODUCT">PRODUCT</option>
          </select>
          <select className={inputClass} value={newDiscount.targetId} onChange={(e) => setNewDiscount((p) => ({ ...p, targetId: e.target.value }))}>
            <option value="">Sin target específico</option>
            {targets.map((target) => (
              <option key={target.id} value={target.id}>{target.name}</option>
            ))}
          </select>
          <select className={inputClass} value={newDiscount.mode} onChange={(e) => setNewDiscount((p) => ({ ...p, mode: e.target.value as NewDiscount["mode"] }))}>
            <option value="PERCENT">PERCENT</option>
            <option value="FIXED">FIXED</option>
          </select>
          <input className={inputClass} placeholder="Valor" value={newDiscount.value} onChange={(e) => setNewDiscount((p) => ({ ...p, value: e.target.value }))} />
          <input className={inputClass} placeholder="Min subtotal" value={newDiscount.minSubtotal} onChange={(e) => setNewDiscount((p) => ({ ...p, minSubtotal: e.target.value }))} />
          <input className={inputClass} type="datetime-local" value={newDiscount.startsAt} onChange={(e) => setNewDiscount((p) => ({ ...p, startsAt: e.target.value }))} />
          <input className={inputClass} type="datetime-local" value={newDiscount.endsAt} onChange={(e) => setNewDiscount((p) => ({ ...p, endsAt: e.target.value }))} />
          <button
            className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}
            disabled={isPending}
            onClick={() =>
              runWithFeedback(
                () =>
                  submitControl({
                    section: "discount",
                    action: "create",
                    data: newDiscount,
                  }),
                "Descuento creado.",
              )
            }
            type="button"
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Crear"}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {discountRows.map((discount, index) => (
            <div key={discount.id} className="grid gap-3 rounded-xl border border-slate-200 p-3 xl:grid-cols-[repeat(10,minmax(0,1fr))_auto]">
              <input className={inputClass} value={discount.name} onChange={(e) => setDiscountRows((rows) => rows.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))} />
              <input className={inputClass} value={discount.description || ""} onChange={(e) => setDiscountRows((rows) => rows.map((row, i) => (i === index ? { ...row, description: e.target.value } : row)))} />
              <select className={inputClass} value={String(discount.targetType || "ORDER")} onChange={(e) => setDiscountRows((rows) => rows.map((row, i) => (i === index ? { ...row, targetType: e.target.value } : row)))}>
                <option value="ORDER">ORDER</option>
                <option value="PLAN">PLAN</option>
                <option value="EXTRA">EXTRA</option>
                <option value="PRODUCT">PRODUCT</option>
              </select>
              <select className={inputClass} value={String(discount.targetId || "")} onChange={(e) => setDiscountRows((rows) => rows.map((row, i) => (i === index ? { ...row, targetId: e.target.value } : row)))}>
                <option value="">Sin target específico</option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>{target.name}</option>
                ))}
              </select>
              <select className={inputClass} value={String(discount.mode || "PERCENT")} onChange={(e) => setDiscountRows((rows) => rows.map((row, i) => (i === index ? { ...row, mode: e.target.value } : row)))}>
                <option value="PERCENT">PERCENT</option>
                <option value="FIXED">FIXED</option>
              </select>
              <input className={inputClass} value={discount.value} onChange={(e) => setDiscountRows((rows) => rows.map((row, i) => (i === index ? { ...row, value: e.target.value } : row)))} />
              <input className={inputClass} value={discount.minSubtotal} onChange={(e) => setDiscountRows((rows) => rows.map((row, i) => (i === index ? { ...row, minSubtotal: e.target.value } : row)))} />
              <input className={inputClass} type="datetime-local" value={discount.startsAt} onChange={(e) => setDiscountRows((rows) => rows.map((row, i) => (i === index ? { ...row, startsAt: e.target.value } : row)))} />
              <input className={inputClass} type="datetime-local" value={discount.endsAt} onChange={(e) => setDiscountRows((rows) => rows.map((row, i) => (i === index ? { ...row, endsAt: e.target.value } : row)))} />
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(discount.active)}
                  onChange={(e) => setDiscountRows((rows) => rows.map((row, i) => (i === index ? { ...row, active: e.target.checked } : row)))}
                />
                Activo
              </label>
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
                  onClick={() =>
                    runWithFeedback(
                      () =>
                        submitControl({
                          section: "discount",
                          action: "update",
                          id: discount.id,
                          data: discount,
                        }),
                      "Descuento actualizado.",
                    )
                  }
                  disabled={isPending}
                >
                  <Check className="h-3.5 w-3.5" />
                  Guardar
                </button>
                <button
                  type="button"
                  className={`${buttonClass} bg-rose-100 text-rose-700 hover:bg-rose-200`}
                  onClick={() =>
                    runWithFeedback(
                      () =>
                        submitControl({
                          section: "discount",
                          action: "delete",
                          id: discount.id,
                        }),
                      "Descuento eliminado.",
                    )
                  }
                  disabled={isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Comentarios de clientes</h2>
        <p className="mt-1 text-xs text-slate-500">Aprueba o rechaza reseñas antes de mostrarlas en la web.</p>

        <div className="mt-4 space-y-3">
          {reviewRows.map((review) => (
            <article key={review.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">{review.name}</p>
                  <p className="text-xs text-slate-500">
                    {review.company || "Sin empresa"} · {review.rating || 0}/5 · {formatDate(review.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      review.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-700"
                        : review.status === "REJECTED"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {review.status || "PENDING"}
                  </span>
                  <button
                    type="button"
                    className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-700`}
                    onClick={() =>
                      runWithFeedback(
                        () =>
                          submitControl({
                            section: "review",
                            action: "approve",
                            id: review.id,
                          }),
                        "Comentario aprobado.",
                      )
                    }
                    disabled={isPending}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Aprobar
                  </button>
                  <button
                    type="button"
                    className={`${buttonClass} bg-rose-100 text-rose-700 hover:bg-rose-200`}
                    onClick={() =>
                      runWithFeedback(
                        () =>
                          submitControl({
                            section: "review",
                            action: "reject",
                            id: review.id,
                          }),
                        "Comentario rechazado.",
                      )
                    }
                    disabled={isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                    Rechazar
                  </button>
                  <button
                    type="button"
                    className={`${buttonClass} bg-slate-100 text-slate-700 hover:bg-slate-200`}
                    onClick={() =>
                      runWithFeedback(
                        () =>
                          submitControl({
                            section: "review",
                            action: "delete",
                            id: review.id,
                          }),
                        "Comentario eliminado.",
                      )
                    }
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{review.comment || ""}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
