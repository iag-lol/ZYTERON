"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Minus, Plus, Search, ShoppingCart, Tag, Trash2 } from "lucide-react";
import type { PublicProduct } from "@/lib/web-control-types";

type Props = {
  products: PublicProduct[];
  whatsappNumber: string;
};

type FilterMode = "all" | "featured" | "combo" | "offer";
type SortMode = "featured" | "price-asc" | "price-desc" | "name-asc";

function currencyCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

function safeDiscountPrice(price: number, discountPct: number) {
  const pct = Math.max(0, Math.min(100, Math.round(discountPct || 0)));
  const discountValue = Math.round(price * (pct / 100));
  return Math.max(0, price - discountValue);
}

function isDiscountDateActive(startsAt?: string | null, endsAt?: string | null) {
  const now = Date.now();
  const startsMs = startsAt ? new Date(startsAt).getTime() : null;
  const endsMs = endsAt ? new Date(endsAt).getTime() : null;
  if (startsMs && !Number.isNaN(startsMs) && startsMs > now) return false;
  if (endsMs && !Number.isNaN(endsMs) && endsMs < now) return false;
  return true;
}

function finalUnitPrice(product: PublicProduct) {
  if (typeof product.finalPrice === "number" && Number.isFinite(product.finalPrice)) {
    return Math.max(0, Math.round(product.finalPrice));
  }
  const discountActive =
    typeof product.discountActive === "boolean"
      ? product.discountActive
      : isDiscountDateActive(product.discountStartsAt, product.discountEndsAt);
  return discountActive
    ? safeDiscountPrice(product.price, product.discountPct)
    : Math.max(0, Math.round(product.price));
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function productHasOffer(product: PublicProduct) {
  if (typeof product.discountActive === "boolean") return product.discountActive || Boolean(product.onOffer);
  return isDiscountDateActive(product.discountStartsAt, product.discountEndsAt) || Boolean(product.onOffer);
}

export function PublicProductsCatalog({ products, whatsappNumber }: Props) {
  const visibleProducts = useMemo(
    () => products.filter((product) => product.published !== false),
    [products],
  );

  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("featured");
  const [query, setQuery] = useState("");

  const cartItems = useMemo(
    () =>
      visibleProducts
        .map((product) => ({
          product,
          qty: qtyById[product.id] || 0,
        }))
        .filter((row) => row.qty > 0),
    [qtyById, visibleProducts],
  );

  const summary = useMemo(() => {
    const subtotal = cartItems.reduce((acc, row) => acc + row.product.price * row.qty, 0);
    const totalDiscount = cartItems.reduce((acc, row) => {
      const unitDiscount = Math.max(0, row.product.price - finalUnitPrice(row.product));
      return acc + unitDiscount * row.qty;
    }, 0);
    const total = Math.max(0, subtotal - totalDiscount);
    return {
      subtotal,
      totalDiscount,
      total,
    };
  }, [cartItems]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = visibleProducts.slice();

    if (q) {
      rows = rows.filter((product) => {
        const haystack = [
          product.name,
          product.publicDescription || product.description,
          product.comboLabel || "",
          ...(product.badges || []),
          ...(product.comboItems || []),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (filterMode === "featured") rows = rows.filter((product) => Boolean(product.featured));
    if (filterMode === "combo") rows = rows.filter((product) => Boolean(product.isCombo));
    if (filterMode === "offer") rows = rows.filter((product) => productHasOffer(product));

    rows.sort((a, b) => {
      if (sortMode === "price-asc") return finalUnitPrice(a) - finalUnitPrice(b);
      if (sortMode === "price-desc") return finalUnitPrice(b) - finalUnitPrice(a);
      if (sortMode === "name-asc") return a.name.localeCompare(b.name, "es");
      const featuredDelta = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featuredDelta !== 0) return featuredDelta;
      return a.name.localeCompare(b.name, "es");
    });

    return rows;
  }, [visibleProducts, query, filterMode, sortMode]);

  const productCounts = useMemo(
    () => ({
      published: visibleProducts.length,
      offers: visibleProducts.filter((product) => productHasOffer(product)).length,
      combos: visibleProducts.filter((product) => product.isCombo).length,
    }),
    [visibleProducts],
  );

  const whatsappHref = useMemo(() => {
    const lines = [
      "Hola Zyteron, quiero cotizar/comprar estos productos:",
      "",
      ...cartItems.map((row) => {
        const finalUnit = finalUnitPrice(row.product);
        const lineTotal = finalUnit * row.qty;
        return `- ${row.product.name} x${row.qty} · ${currencyCLP(finalUnit)} c/u · ${currencyCLP(lineTotal)}`;
      }),
      cartItems.length === 0 ? "- Aún no agrego productos" : "",
      "",
      `Subtotal: ${currencyCLP(summary.subtotal)}`,
      `Descuento: ${currencyCLP(summary.totalDiscount)}`,
      `Total: ${currencyCLP(summary.total)}`,
      "",
      "Quedo atento a disponibilidad y tiempos de entrega.",
    ].filter(Boolean);

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
  }, [cartItems, summary.subtotal, summary.total, summary.totalDiscount, whatsappNumber]);

  const updateQty = (productId: string, nextQty: number) => {
    setQtyById((prev) => {
      if (nextQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: Math.min(99, Math.max(1, Math.round(nextQty))),
      };
    });
  };

  const clearCart = () => setQtyById({});

  if (visibleProducts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
        No hay productos publicados en Supabase para mostrar en catálogo.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, detalle o combo"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: `Todos (${productCounts.published})` },
              { key: "offer", label: `Ofertas (${productCounts.offers})` },
              { key: "combo", label: `Combos (${productCounts.combos})` },
              { key: "featured", label: "Destacados" },
            ].map((filter) => {
              const active = filterMode === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setFilterMode(filter.key as FilterMode)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>

          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-400"
          >
            <option value="featured">Priorizar destacados</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="name-asc">Nombre A-Z</option>
          </select>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.44fr_0.56fr]">
        <div>
          {filteredProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
              No hay resultados con los filtros seleccionados.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const qty = qtyById[product.id] || 0;
                const finalUnit = finalUnitPrice(product);
                const imageUrl = product.imageUrl?.trim();
                const promoStart = formatDateTime(product.discountStartsAt);
                const promoEnd = formatDateTime(product.discountEndsAt);
                const discountActive =
                  typeof product.discountActive === "boolean"
                    ? product.discountActive
                    : isDiscountDateActive(product.discountStartsAt, product.discountEndsAt);

                return (
                  <article
                    key={product.id}
                    className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {imageUrl ? (
                      <div className="mb-4 overflow-hidden rounded-xl border border-slate-100 bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl} alt={product.name} className="h-44 w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
                      </div>
                    ) : (
                      <div className="mb-4 flex h-44 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                        Imagen pendiente
                      </div>
                    )}

                    <div className="flex flex-1 flex-col">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold leading-snug text-slate-900">{product.name}</h3>
                        <div className="flex flex-col items-end gap-1">
                          {product.featured ? (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              Destacado
                            </span>
                          ) : null}
                          {product.isCombo ? (
                            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              {product.comboLabel || "Combo"}
                            </span>
                          ) : null}
                          {productHasOffer(product) ? (
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              Oferta
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <p className="text-xs leading-relaxed text-slate-600">{product.publicDescription || product.description}</p>

                      <ul className="mt-3 space-y-1 text-xs text-slate-600">
                        <li className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                          <span>Stock disponible: {product.stock}</span>
                        </li>
                        {product.badges.slice(0, 2).map((badge) => (
                          <li key={`${product.id}-${badge}`} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                            <span>{badge}</span>
                          </li>
                        ))}
                        {product.isCombo && Array.isArray(product.comboItems) && product.comboItems.length > 0
                          ? product.comboItems.slice(0, 2).map((item) => (
                              <li key={`${product.id}-${item}`} className="flex items-start gap-2">
                                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" />
                                <span>{item}</span>
                              </li>
                            ))
                          : null}
                      </ul>
                    </div>

                    <div className="mt-auto space-y-1.5 pt-4">
                      {product.discountPct > 0 && discountActive ? (
                        <p className="text-xs text-slate-400 line-through">{currencyCLP(product.price)}</p>
                      ) : null}
                      <p className="text-2xl font-extrabold tracking-tight text-slate-900">{currencyCLP(finalUnit)}</p>

                      {product.discountPct > 0 && !discountActive && (promoStart || promoEnd) ? (
                        <p className="text-[11px] font-medium text-amber-700">
                          Promoción programada {promoStart ? `desde ${promoStart}` : ""} {promoEnd ? `hasta ${promoEnd}` : ""}
                        </p>
                      ) : null}

                      {product.discountPct > 0 && discountActive && promoEnd ? (
                        <p className="text-[11px] font-medium text-emerald-700">Promoción activa hasta {promoEnd}</p>
                      ) : null}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => updateQty(product.id, qty > 0 ? 0 : 1)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                          qty > 0 ? "bg-slate-900 text-white hover:bg-slate-700" : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                        }`}
                      >
                        {qty > 0 ? "Quitar" : "Agregar"}
                      </button>

                      {qty > 0 ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                            onClick={() => updateQty(product.id, qty - 1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-slate-700">{qty}</span>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                            onClick={() => updateQty(product.id, qty + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400">No agregado</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-700" />
                <h4 className="text-sm font-bold text-slate-900">Solicitud de productos</h4>
              </div>
              {cartItems.length > 0 ? (
                <button
                  type="button"
                  onClick={clearCart}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                >
                  <Trash2 className="h-3 w-3" /> Limpiar
                </button>
              ) : null}
            </div>

            {cartItems.length === 0 ? (
              <p className="text-sm text-slate-500">Agrega productos para generar una solicitud por WhatsApp.</p>
            ) : (
              <div className="space-y-2 text-sm">
                {cartItems.map((row) => {
                  const finalUnit = finalUnitPrice(row.product);
                  return (
                    <div key={`cart-${row.product.id}`} className="flex items-start justify-between gap-2">
                      <span className="text-slate-600">{row.product.name} x{row.qty}</span>
                      <span className="font-semibold text-slate-900">{currencyCLP(finalUnit * row.qty)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="my-4 border-t border-slate-200" />

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-900">{currencyCLP(summary.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Descuento</span>
                <span className="font-semibold text-emerald-700">-{currencyCLP(summary.totalDiscount)}</span>
              </div>
            </div>

            <div className="my-4 border-t-2 border-slate-200" />

            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900">Total</span>
              <span className="text-xl font-extrabold text-blue-700">{currencyCLP(summary.total)}</span>
            </div>

            <Link
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700"
            >
              Enviar solicitud por WhatsApp <ArrowRight className="h-4 w-4" />
            </Link>

            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Tag className="h-3.5 w-3.5" />
              Valores y promociones se toman del panel administrativo.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
