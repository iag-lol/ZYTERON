"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, PlusCircle, Save, Trash2 } from "lucide-react";
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

function isDiscountDateActive(
  startsAt?: string | null,
  endsAt?: string | null,
  nowMs = Date.now(),
) {
  const startsMs = startsAt ? new Date(startsAt).getTime() : null;
  const endsMs = endsAt ? new Date(endsAt).getTime() : null;
  if (startsMs && !Number.isNaN(startsMs) && startsMs > nowMs) return false;
  if (endsMs && !Number.isNaN(endsMs) && endsMs < nowMs) return false;
  return true;
}

export function ProductsCatalogManager({ products, categories }: Props) {
  const [isPending, startTransition] = useTransition();
  const [alert, setAlert] = useState<AlertState>({ type: "idle" });

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
    discountPct: "0",
    stock: "0",
    soldUnits: "0",
    featured: false,
    published: true,
    onOffer: false,
    isCombo: false,
    comboLabel: "",
    comboItems: "",
    costPrice: "0",
    discountStartsAt: "",
    discountEndsAt: "",
    status: "ACTIVE",
    notes: "",
    badges: "",
    categoryId: categories[0]?.id || "",
  });

  const sortedRows = useMemo(
    () =>
      rows
        .slice()
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
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

    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "No se pudo guardar el producto.");
    }
  }

  function runWithFeedback(action: () => Promise<void>, successMessage: string) {
    setAlert({ type: "idle" });
    startTransition(async () => {
      try {
        await action();
        setAlert({ type: "success", message: successMessage });
        location.reload();
      } catch (error) {
        setAlert({
          type: "error",
          message: error instanceof Error ? error.message : "Error inesperado.",
        });
      }
    });
  }

  return (
    <div className="space-y-7">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Catálogo</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Gestión avanzada de productos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Controla desde aquí la creación, estado comercial, vendidos, descuentos, ofertas, combos y publicación web.
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
        <h2 className="text-base font-bold text-slate-900">Formulario de producto</h2>
        <p className="mt-1 text-xs text-slate-500">Ingresa un producto nuevo con toda su información comercial y de publicación.</p>

        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-12">
          <input className={`${inputClass} lg:col-span-2`} placeholder="slug" value={newProduct.slug} onChange={(e) => setNewProduct((p) => ({ ...p, slug: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-3`} placeholder="nombre" value={newProduct.name} onChange={(e) => setNewProduct((p) => ({ ...p, name: e.target.value }))} />
          <select className={`${inputClass} lg:col-span-2`} value={newProduct.status} onChange={(e) => setNewProduct((p) => ({ ...p, status: e.target.value as NewProduct["status"] }))}>
            <option value="DRAFT">Borrador</option>
            <option value="ACTIVE">Activo</option>
            <option value="PAUSED">Pausado</option>
            <option value="SOLD_OUT">Agotado</option>
          </select>
          <input className={`${inputClass} lg:col-span-2`} placeholder="precio" value={newProduct.price} onChange={(e) => setNewProduct((p) => ({ ...p, price: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-2`} placeholder="costo (ganancia)" value={newProduct.costPrice} onChange={(e) => setNewProduct((p) => ({ ...p, costPrice: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-1`} placeholder="% desc" value={newProduct.discountPct} onChange={(e) => setNewProduct((p) => ({ ...p, discountPct: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-1`} placeholder="stock" value={newProduct.stock} onChange={(e) => setNewProduct((p) => ({ ...p, stock: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-1`} placeholder="vendidos" value={newProduct.soldUnits} onChange={(e) => setNewProduct((p) => ({ ...p, soldUnits: e.target.value }))} />

          <select className={`${inputClass} lg:col-span-3`} value={newProduct.categoryId} onChange={(e) => setNewProduct((p) => ({ ...p, categoryId: e.target.value }))}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <input className={`${inputClass} lg:col-span-4`} placeholder="imagen URL pública" value={newProduct.imageUrl} onChange={(e) => setNewProduct((p) => ({ ...p, imageUrl: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-3`} placeholder="etiqueta combo (opcional)" value={newProduct.comboLabel} onChange={(e) => setNewProduct((p) => ({ ...p, comboLabel: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-2`} type="datetime-local" value={newProduct.discountStartsAt} onChange={(e) => setNewProduct((p) => ({ ...p, discountStartsAt: e.target.value }))} />
          <input className={`${inputClass} lg:col-span-2`} type="datetime-local" value={newProduct.discountEndsAt} onChange={(e) => setNewProduct((p) => ({ ...p, discountEndsAt: e.target.value }))} />

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

          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 lg:col-span-2"
            disabled={isPending}
            onClick={() =>
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
              )
            }
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlusCircle className="h-3.5 w-3.5" />} Crear producto
          </button>

          <textarea className={`${textareaClass} lg:col-span-6`} rows={2} placeholder="descripción interna" value={newProduct.description} onChange={(e) => setNewProduct((p) => ({ ...p, description: e.target.value }))} />
          <textarea className={`${textareaClass} lg:col-span-6`} rows={2} placeholder="descripción pública" value={newProduct.publicDescription} onChange={(e) => setNewProduct((p) => ({ ...p, publicDescription: e.target.value }))} />
          <textarea className={`${textareaClass} lg:col-span-6`} rows={2} placeholder="badges (una línea por item)" value={newProduct.badges} onChange={(e) => setNewProduct((p) => ({ ...p, badges: e.target.value }))} />
          <textarea className={`${textareaClass} lg:col-span-6`} rows={2} placeholder="items del combo (una línea por item)" value={newProduct.comboItems} onChange={(e) => setNewProduct((p) => ({ ...p, comboItems: e.target.value }))} />
          <textarea className={`${textareaClass} lg:col-span-6`} rows={2} placeholder="notas internas del producto" value={newProduct.notes} onChange={(e) => setNewProduct((p) => ({ ...p, notes: e.target.value }))} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Tabla de productos</h2>
            <p className="mt-1 text-xs text-slate-500">Visualiza y edita creación, estado, vendidos, descuento, oferta, combo, stock y publicación.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{rows.length} registros</span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[1650px] w-full text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Producto</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Creación</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Estado</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Precio</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Desc %</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Stock</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Vendidos</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Oferta</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Combo</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Publicado</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Resumen</th>
                <th className="px-3 py-2 text-left font-bold uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.map((row) => {
                const basePrice = toMoneyValue(row.priceText);
                const discountPct = Math.max(0, Math.min(100, toMoneyValue(row.discountPctText)));
                const costPrice = Math.max(0, toMoneyValue(row.costPriceText));
                const discountActive = discountPct > 0 && isDiscountDateActive(row.discountStartsAt, row.discountEndsAt);
                const finalPrice = basePrice * (1 - (discountActive ? discountPct : 0) / 100);
                const utilityPerUnit = finalPrice - costPrice;
                const marginPct = finalPrice > 0 ? (utilityPerUnit / finalPrice) * 100 : 0;
                return (
                  <tr key={row.id} className="align-top">
                    <td className="px-3 py-3">
                      <div className="space-y-1">
                        <input className={inputClass} value={row.name} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, name: e.target.value } : item)))} />
                        <input className={inputClass} value={row.slug} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, slug: e.target.value.toLowerCase() } : item)))} />
                        <select className={inputClass} value={String(row.categoryId || "")} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, categoryId: e.target.value } : item)))}>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-600">{formatDate(row.createdAt)}</td>
                    <td className="px-3 py-3">
                      <div className="space-y-2">
                        <select className={inputClass} value={row.status} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, status: e.target.value as ProductRow["status"] } : item)))}>
                          <option value="DRAFT">Borrador</option>
                          <option value="ACTIVE">Activo</option>
                          <option value="PAUSED">Pausado</option>
                          <option value="SOLD_OUT">Agotado</option>
                        </select>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${statusBadge(row.status)}`}>
                          {row.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3"><input className={inputClass} value={row.priceText} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, priceText: e.target.value } : item)))} /></td>
                    <td className="px-3 py-3"><input className={inputClass} value={row.discountPctText} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, discountPctText: e.target.value } : item)))} /></td>
                    <td className="px-3 py-3"><input className={inputClass} value={row.stockText} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, stockText: e.target.value } : item)))} /></td>
                    <td className="px-3 py-3"><input className={inputClass} value={row.soldUnitsText} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, soldUnitsText: e.target.value } : item)))} /></td>
                    <td className="px-3 py-3">
                      <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700">
                        <input type="checkbox" checked={row.onOffer} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, onOffer: e.target.checked } : item)))} />
                        Oferta
                      </label>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-2">
                        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700">
                          <input type="checkbox" checked={row.isCombo} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, isCombo: e.target.checked } : item)))} />
                          Combo
                        </label>
                        <input className={inputClass} placeholder="Nombre del combo" value={row.comboLabel} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, comboLabel: e.target.value } : item)))} />
                        <textarea className={textareaClass} rows={2} placeholder="Items del combo (una línea por item)" value={row.comboItemsText} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, comboItemsText: e.target.value } : item)))} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-2">
                        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700">
                          <input type="checkbox" checked={row.published} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, published: e.target.checked } : item)))} />
                          Publicado
                        </label>
                        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700">
                          <input type="checkbox" checked={Boolean(row.featured)} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, featured: e.target.checked } : item)))} />
                          Destacado
                        </label>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="space-y-2">
                        <p className="rounded-lg bg-blue-50 px-2 py-1 text-blue-800">Final: {currencyCLP(finalPrice)}</p>
                        <p className={`rounded-lg px-2 py-1 ${utilityPerUnit >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
                          Utilidad/u: {currencyCLP(utilityPerUnit)}
                        </p>
                        <p className={`rounded-lg px-2 py-1 ${marginPct >= 0 ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
                          Margen: {marginPct.toFixed(1)}%
                        </p>
                        <input className={inputClass} placeholder="Costo base" value={row.costPriceText} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, costPriceText: e.target.value } : item)))} />
                        <input className={inputClass} type="datetime-local" value={row.discountStartsAt} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, discountStartsAt: e.target.value } : item)))} />
                        <input className={inputClass} type="datetime-local" value={row.discountEndsAt} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, discountEndsAt: e.target.value } : item)))} />
                        <input className={inputClass} placeholder="URL imagen" value={row.imageUrl} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, imageUrl: e.target.value } : item)))} />
                        <textarea className={textareaClass} rows={2} placeholder="Descripción pública" value={row.publicDescription} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, publicDescription: e.target.value } : item)))} />
                        <textarea className={textareaClass} rows={2} placeholder="Descripción interna" value={row.description || ""} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, description: e.target.value } : item)))} />
                        <textarea className={textareaClass} rows={2} placeholder="Badges (una línea por item)" value={row.badgesText} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, badgesText: e.target.value } : item)))} />
                        <textarea className={textareaClass} rows={2} placeholder="Notas" value={row.notes} onChange={(e) => setRows((items) => items.map((item) => (item.id === row.id ? { ...item, notes: e.target.value } : item)))} />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-1.5 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-100 px-2 py-1.5 font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50"
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
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
