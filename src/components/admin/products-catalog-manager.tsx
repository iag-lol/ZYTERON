"use client";

import { useMemo, useState, useTransition } from "react";
import { ImagePlus, Loader2, PlusCircle, Save, Trash2 } from "lucide-react";
import type { ProductCategoryRecord, ProductRecord } from "@/lib/admin/repository";

type ProductRow = ProductRecord & {
  originalSlug: string;
  priceText: string;
  discountPctText: string;
  stockText: string;
  soldUnitsText: string;
  badgesText: string;
  imageUrl: string;
  publicDescription: string;
  published: boolean;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "SOLD_OUT";
  soldUnits: number;
  onOffer: boolean;
  isCombo: boolean;
  comboLabel: string;
  comboItemsText: string;
  costPriceText: string;
  discountStartsAt: string;
  discountEndsAt: string;
  notes: string;
};

type Props = {
  products: ProductRecord[];
  categories: ProductCategoryRecord[];
};

type NewProduct = {
  slug: string;
  name: string;
  description: string;
  publicDescription: string;
  imageUrl: string;
  price: string;
  discountPct: string;
  stock: string;
  soldUnits: string;
  featured: boolean;
  published: boolean;
  onOffer: boolean;
  isCombo: boolean;
  comboLabel: string;
  comboItems: string;
  costPrice: string;
  discountStartsAt: string;
  discountEndsAt: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "SOLD_OUT";
  notes: string;
  badges: string;
  categoryId: string;
};

type AlertState =
  | { type: "idle" }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

const textareaClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-y";

function currencyCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value || 0)));
}

function toMoneyValue(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function parseTextRows(value?: string[] | null) {
  return Array.isArray(value) ? value.join("\n") : "";
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

function statusBadge(status: ProductRow["status"]) {
  if (status === "ACTIVE") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "PAUSED") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "SOLD_OUT") return "bg-rose-50 text-rose-700 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function toDateTimeInput(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mm = String(parsed.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

function isDiscountDateActive(startsAt?: string | null, endsAt?: string | null, nowMs = Date.now()) {
  const startsMs = startsAt ? new Date(startsAt).getTime() : null;
  const endsMs = endsAt ? new Date(endsAt).getTime() : null;
  if (startsMs && !Number.isNaN(startsMs) && startsMs > nowMs) return false;
  if (endsMs && !Number.isNaN(endsMs) && endsMs < nowMs) return false;
  return true;
}

export function ProductsCatalogManager({ products, categories }: Props) {
  const [isPending, startTransition] = useTransition();
  const [alert, setAlert] = useState<AlertState>({ type: "idle" });
  const [uploadingNewImage, setUploadingNewImage] = useState(false);
  const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);
  const [inlineCreateFeedback, setInlineCreateFeedback] = useState("");

  const [rows, setRows] = useState<ProductRow[]>(
    products.map((product) => ({
      ...product,
      originalSlug: String(product.slug || "").toLowerCase(),
      priceText: String(product.price ?? 0),
      discountPctText: String(product.discountPct ?? 0),
      stockText: String(product.stock ?? 0),
      soldUnitsText: String(product.soldUnits ?? 0),
      badgesText: parseTextRows(product.badges),
      imageUrl: String(product.imageUrl || ""),
      publicDescription: String(product.publicDescription || product.description || ""),
      published: typeof product.published === "boolean" ? product.published : true,
      status: ["DRAFT", "ACTIVE", "PAUSED", "SOLD_OUT"].includes(String(product.status || "").toUpperCase())
        ? (String(product.status || "").toUpperCase() as ProductRow["status"])
        : "ACTIVE",
      soldUnits: Number(product.soldUnits ?? 0) || 0,
      onOffer: Boolean(product.onOffer),
      isCombo: Boolean(product.isCombo),
      comboLabel: String(product.comboLabel || ""),
      comboItemsText: parseTextRows(product.comboItems),
      costPriceText: String(product.costPrice ?? 0),
      discountStartsAt: toDateTimeInput(product.discountStartsAt),
      discountEndsAt: toDateTimeInput(product.discountEndsAt),
      notes: String(product.notes || ""),
    })),
  );

  const [newProduct, setNewProduct] = useState<NewProduct>({
    slug: "",
    name: "",
    description: "",
    publicDescription: "",
    imageUrl: "",
    price: "",
    discountPct: "",
    stock: "",
    soldUnits: "",
    featured: false,
    published: true,
    onOffer: false,
    isCombo: false,
    comboLabel: "",
    comboItems: "",
    costPrice: "",
    discountStartsAt: "",
    discountEndsAt: "",
    status: "ACTIVE",
    notes: "",
    badges: "",
    categoryId: categories[0]?.id || "",
  });

  const sortedRows = useMemo(
    () => rows.slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [rows],
  );

  async function submitProduct(payload: Record<string, unknown>) {
    const response = await fetch("/admin/productos/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (response.redirected && response.url.includes("/admin/login")) {
      throw new Error("Sesión admin expirada. Inicia sesión nuevamente.");
    }

    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "No se pudo guardar el producto.");
    }
  }

  async function uploadImage(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/admin/productos/upload-image", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
    if (!response.ok || !payload?.ok || !payload.url) {
      throw new Error(payload?.error || "No se pudo subir la imagen.");
    }
    return payload.url;
  }

  function runWithFeedback(action: () => Promise<void>, successMessage: string) {
    setAlert({ type: "idle" });
    setInlineCreateFeedback("");
    startTransition(async () => {
      try {
        await action();
        setAlert({ type: "success", message: successMessage });
        setInlineCreateFeedback(successMessage);
        location.reload();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error inesperado.";
        setAlert({
          type: "error",
          message,
        });
        setInlineCreateFeedback(message);
      }
    });
  }

  async function handleNewImageFile(file: File) {
    setAlert({ type: "idle" });
    setUploadingNewImage(true);
    try {
      const url = await uploadImage(file);
      setNewProduct((prev) => ({ ...prev, imageUrl: url }));
      setAlert({ type: "success", message: "Imagen subida correctamente." });
    } catch (error) {
      setAlert({ type: "error", message: error instanceof Error ? error.message : "Error al subir imagen." });
    } finally {
      setUploadingNewImage(false);
    }
  }

  async function handleRowImageFile(rowId: string, file: File) {
    setAlert({ type: "idle" });
    setUploadingRowId(rowId);
    try {
      const url = await uploadImage(file);
      setRows((items) => items.map((item) => (item.id === rowId ? { ...item, imageUrl: url } : item)));
      setAlert({ type: "success", message: "Imagen subida correctamente. Guarda para persistir el cambio." });
    } catch (error) {
      setAlert({ type: "error", message: error instanceof Error ? error.message : "Error al subir imagen." });
    } finally {
      setUploadingRowId(null);
    }
  }

  const missingRequiredForCreate = useMemo(() => {
    const missing: string[] = [];
    if (!newProduct.name.trim()) missing.push("nombre");
    if (!newProduct.price.trim() || toMoneyValue(newProduct.price) <= 0) missing.push("precio");
    if (!newProduct.categoryId.trim()) missing.push("categoría");
    return missing;
  }, [newProduct.name, newProduct.price, newProduct.categoryId]);

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Catálogo</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Gestión avanzada de productos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Crea productos con imagen, combos, ofertas por fecha, descuentos y publicación web.
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

      {categories.length === 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-bold text-amber-900">Faltan categorías de productos</h2>
          <p className="mt-1 text-xs text-amber-800">
            Para crear productos primero se deben crear categorías en Supabase.
          </p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            disabled={isPending}
            onClick={() =>
              runWithFeedback(
                () => submitProduct({ action: "ensure_categories" }),
                "Categorías base creadas correctamente.",
              )
            }
          >
            {isPending ? "Creando..." : "Crear categorías base"}
          </button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Formulario de producto</h2>
        <p className="mt-1 text-xs text-slate-500">Ingresa un producto nuevo con información comercial completa.</p>
        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
          <p className="font-semibold">Qué completar en los campos clave:</p>
          <p className="mt-1">`precio`: valor de venta (ej: 549990) · `costo`: costo interno (ej: 380000) · `% desc`: porcentaje 0 a 100 · `stock`: unidades disponibles.</p>
        </div>

        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-12">
          <input className={`${inputClass} lg:col-span-2`} placeholder="slug" value={newProduct.slug} onChange={(e) => setNewProduct((p) => ({ ...p, slug: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-3`} placeholder="nombre" value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} />
          <select className={`${inputClass} lg:col-span-2`} value={newProduct.status} onChange={(e) => setNewProduct((p) => ({ ...p, status: e.target.value as NewProduct["status"] }))}>
            <option value="DRAFT">Borrador</option>
            <option value="ACTIVE">Activo</option>
            <option value="PAUSED">Pausado</option>
            <option value="SOLD_OUT">Agotado</option>
          </select>
          <input className={`${inputClass} lg:col-span-2`} placeholder="precio (ej: 549990)" value={newProduct.price} onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-1`} placeholder="costo (ej: 380000)" value={newProduct.costPrice} onChange={(e) => setNewProduct((p) => ({ ...p, costPrice: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-1`} placeholder="% descuento (0-100)" value={newProduct.discountPct} onChange={(e) => setNewProduct((p) => ({ ...p, discountPct: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-1`} placeholder="stock (ej: 15)" value={newProduct.stock} onChange={(e) => setNewProduct((p) => ({ ...p, stock: e.target.value }))} />

          <select className={`${inputClass} lg:col-span-3`} value={newProduct.categoryId} onChange={(e) => setNewProduct((p) => ({ ...p, categoryId: e.target.value }))}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>

          <input className={`${inputClass} lg:col-span-3`} placeholder="etiqueta combo (opcional)" value={newProduct.comboLabel} onChange={(e) => setNewProduct((p) => ({ ...p, comboLabel: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-2`} type="datetime-local" value={newProduct.discountStartsAt} onChange={(e) => setNewProduct((p) => ({ ...p, discountStartsAt: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-2`} type="datetime-local" value={newProduct.discountEndsAt} onChange={(e) => setNewProduct((p) => ({ ...p, discountEndsAt: e.target.value }))} />

          <div className="rounded-lg border border-slate-200 bg-white p-3 lg:col-span-4">
            <p className="text-[11px] font-semibold text-slate-600">Imagen del producto</p>
            {newProduct.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={newProduct.imageUrl} alt="preview" className="mt-2 h-24 w-full rounded-md object-cover" />
            ) : (
              <div className="mt-2 flex h-24 items-center justify-center rounded-md border border-dashed border-slate-300 text-[11px] text-slate-500">Sin imagen</div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                <ImagePlus className="h-3.5 w-3.5" /> Adjuntar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleNewImageFile(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {uploadingNewImage ? <Loader2 className="h-4 w-4 animate-spin text-blue-700" /> : null}
            </div>
            <input className={`${inputClass} mt-2`} placeholder="o pega URL pública" value={newProduct.imageUrl} onChange={(e) => setNewProduct((p) => ({ ...p, imageUrl: e.target.value }))} />
          </div>

          <div className="grid gap-2 lg:col-span-4">
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              <input type="checkbox" checked={newProduct.featured} onChange={(e) => setNewProduct((p) => ({ ...p, featured: e.target.checked }))} /> Destacado
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              <input type="checkbox" checked={newProduct.published} onChange={(e) => setNewProduct((p) => ({ ...p, published: e.target.checked }))} /> Publicado
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              <input type="checkbox" checked={newProduct.onOffer} onChange={(e) => setNewProduct((p) => ({ ...p, onOffer: e.target.checked }))} /> Oferta
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700">
              <input type="checkbox" checked={newProduct.isCombo} onChange={(e) => setNewProduct((p) => ({ ...p, isCombo: e.target.checked }))} /> Parte de combo
            </label>
          </div>

          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 lg:col-span-4"
            disabled={isPending}
            onClick={() =>
              {
                if (missingRequiredForCreate.length > 0) {
                  const message = `Faltan campos obligatorios: ${missingRequiredForCreate.join(", ")}.`;
                  setAlert({
                    type: "error",
                    message,
                  });
                  setInlineCreateFeedback(message);
                  return;
                }

                runWithFeedback(
                  () =>
                    submitProduct({
                      action: "create",
                      data: {
                        ...newProduct,
                        badges: newProduct.badges,
                      },
                    }),
                  "Producto creado correctamente.",
                );
              }
            }
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />} Crear producto
          </button>
          <p className="text-[11px] text-slate-500 lg:col-span-8">
            Obligatorios para crear: nombre, precio y categoría. `slug` y descripción se completan automáticamente si los dejas vacíos.
          </p>
          {inlineCreateFeedback ? (
            <p className={`text-xs lg:col-span-12 ${alert.type === "error" ? "text-rose-700" : "text-emerald-700"}`}>
              {inlineCreateFeedback}
            </p>
          ) : null}

          <textarea className={`${textareaClass} lg:col-span-6`} rows={2} placeholder="descripción interna" value={newProduct.description} onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))} />
          <textarea className={`${textareaClass} lg:col-span-6`} rows={2} placeholder="descripción pública" value={newProduct.publicDescription} onChange={(e) => setNewProduct((p) => ({ ...p, publicDescription: e.target.value }))} />
          <textarea className={`${textareaClass} lg:col-span-6`} rows={2} placeholder="badges (una línea por item)" value={newProduct.badges} onChange={(e) => setNewProduct((p) => ({ ...p, badges: e.target.value }))} />
          <textarea className={`${textareaClass} lg:col-span-6`} rows={2} placeholder="items del combo (una línea por item)" value={newProduct.comboItems} onChange={(e) => setNewProduct((p) => ({ ...p, comboItems: e.target.value }))} />
          <textarea className={`${textareaClass} lg:col-span-12`} rows={2} placeholder="notas internas del producto" value={newProduct.notes} onChange={(e) => setNewProduct((p) => ({ ...p, notes: e.target.value }))} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Productos publicados y borradores</h2>
            <p className="mt-1 text-xs text-slate-500">Edición por tarjetas para evitar scroll horizontal.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{rows.length} registros</span>
        </div>

        {rows.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            Aún no hay productos. Crea el primero desde el formulario superior.
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {sortedRows.map((row) => {
              const basePrice = toMoneyValue(row.priceText);
              const discountPct = Math.max(0, Math.min(100, toMoneyValue(row.discountPctText)));
              const costPrice = Math.max(0, toMoneyValue(row.costPriceText));
              const discountActive = discountPct > 0 && isDiscountDateActive(row.discountStartsAt, row.discountEndsAt);
              const finalPrice = basePrice * (1 - (discountActive ? discountPct : 0) / 100);
              const utilityPerUnit = finalPrice - costPrice;
              const marginPct = finalPrice > 0 ? (utilityPerUnit / finalPrice) * 100 : 0;

              return (
                <article key={row.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{row.name || "Producto sin nombre"}</p>
                      <p className="text-[11px] text-slate-500">Creado: {formatDate(row.createdAt)}</p>
                    </div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusBadge(row.status)}`}>
                      {row.status}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className={inputClass} value={row.name} placeholder="nombre" onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, name: e.target.value } : item)))} />
                    <input className={inputClass} value={row.slug} placeholder="slug" onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, slug: e.target.value.toLowerCase() } : item)))} />

                    <select className={inputClass} value={String(row.categoryId || "")} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, categoryId: e.target.value } : item)))}>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                    <select className={inputClass} value={row.status} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, status: e.target.value as ProductRow["status"] } : item)))}>
                      <option value="DRAFT">Borrador</option>
                      <option value="ACTIVE">Activo</option>
                      <option value="PAUSED">Pausado</option>
                      <option value="SOLD_OUT">Agotado</option>
                    </select>

                    <input className={inputClass} value={row.priceText} placeholder="precio" onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, priceText: e.target.value } : item)))} />
                    <input className={inputClass} value={row.costPriceText} placeholder="costo" onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, costPriceText: e.target.value } : item)))} />

                    <input className={inputClass} value={row.discountPctText} placeholder="% descuento" onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, discountPctText: e.target.value } : item)))} />
                    <input className={inputClass} value={row.stockText} placeholder="stock" onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, stockText: e.target.value } : item)))} />

                    <input className={inputClass} value={row.soldUnitsText} placeholder="vendidos" onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, soldUnitsText: e.target.value } : item)))} />
                    <input className={inputClass} value={row.comboLabel} placeholder="etiqueta combo" onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, comboLabel: e.target.value } : item)))} />

                    <input className={inputClass} type="datetime-local" value={row.discountStartsAt} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, discountStartsAt: e.target.value } : item)))} />
                    <input className={inputClass} type="datetime-local" value={row.discountEndsAt} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, discountEndsAt: e.target.value } : item)))} />
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-[11px] font-semibold text-slate-600">Imagen</p>
                    {row.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.imageUrl} alt={row.name || "preview"} className="mt-2 h-28 w-full rounded-md object-cover" />
                    ) : (
                      <div className="mt-2 flex h-28 items-center justify-center rounded-md border border-dashed border-slate-300 text-[11px] text-slate-500">Sin imagen</div>
                    )}
                    <div className="mt-2 flex items-center gap-2">
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50">
                        <ImagePlus className="h-3.5 w-3.5" /> Adjuntar
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handleRowImageFile(row.id, file);
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      {uploadingRowId === row.id ? <Loader2 className="h-4 w-4 animate-spin text-blue-700" /> : null}
                    </div>
                    <input className={`${inputClass} mt-2`} placeholder="URL imagen pública" value={row.imageUrl} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, imageUrl: e.target.value } : item)))} />
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                      <input type="checkbox" checked={row.onOffer} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, onOffer: e.target.checked } : item)))} /> Oferta
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                      <input type="checkbox" checked={row.isCombo} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, isCombo: e.target.checked } : item)))} /> Combo
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                      <input type="checkbox" checked={row.published} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, published: e.target.checked } : item)))} /> Publicado
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700">
                      <input type="checkbox" checked={Boolean(row.featured)} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, featured: e.target.checked } : item)))} /> Destacado
                    </label>
                  </div>

                  <div className="mt-3 grid gap-2">
                    <textarea className={textareaClass} rows={2} placeholder="descripción pública" value={row.publicDescription} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, publicDescription: e.target.value } : item)))} />
                    <textarea className={textareaClass} rows={2} placeholder="descripción interna" value={row.description || ""} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, description: e.target.value } : item)))} />
                    <textarea className={textareaClass} rows={2} placeholder="badges (una línea por item)" value={row.badgesText} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, badgesText: e.target.value } : item)))} />
                    <textarea className={textareaClass} rows={2} placeholder="items del combo (una línea por item)" value={row.comboItemsText} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, comboItemsText: e.target.value } : item)))} />
                    <textarea className={textareaClass} rows={2} placeholder="notas" value={row.notes} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, notes: e.target.value } : item)))} />
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <p className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-800">Final: {currencyCLP(finalPrice)}</p>
                    <p className={`rounded-lg px-2 py-1 text-xs ${utilityPerUnit >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
                      Utilidad/u: {currencyCLP(utilityPerUnit)}
                    </p>
                    <p className={`rounded-lg px-2 py-1 text-xs ${marginPct >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
                      Margen: {marginPct.toFixed(1)}%
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      disabled={isPending}
                      onClick={() =>
                        runWithFeedback(
                          () =>
                            submitProduct({
                              action: "update",
                              id: row.id,
                              data: {
                                ...row,
                                price: row.priceText,
                                discountPct: row.discountPctText,
                                stock: row.stockText,
                                soldUnits: row.soldUnitsText,
                                badges: row.badgesText,
                                comboItems: row.comboItemsText,
                                costPrice: row.costPriceText,
                                discountStartsAt: row.discountStartsAt,
                                discountEndsAt: row.discountEndsAt,
                                previousSlug: row.originalSlug,
                              },
                            }),
                          `Producto ${row.name} actualizado.`,
                        )
                      }
                    >
                      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
                    </button>

                    <button
                      type="button"
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-rose-100 px-2 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                      disabled={isPending}
                      onClick={() =>
                        runWithFeedback(
                          () =>
                            submitProduct({
                              action: "delete",
                              id: row.id,
                              data: {
                                slug: row.slug,
                              },
                            }),
                          `Producto ${row.name} eliminado.`,
                        )
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
