"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import type { PublicProduct } from "@/lib/web-control-types";

type Props = {
  products: PublicProduct[];
  whatsappNumber: string;
};

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

export function PublicProductsCatalog({ products, whatsappNumber }: Props) {
  const visibleProducts = useMemo(
    () => products.filter((product) => product.published !== false),
    [products],
  );

  const [qtyById, setQtyById] = useState<Record<string, number>>({});

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
      const unitDiscount = Math.max(0, row.product.price - safeDiscountPrice(row.product.price, row.product.discountPct));
      return acc + unitDiscount * row.qty;
    }, 0);
    const total = Math.max(0, subtotal - totalDiscount);
    return {
      subtotal,
      totalDiscount,
      total,
    };
  }, [cartItems]);

  const whatsappHref = useMemo(() => {
    const lines = [
      "Hola Zyteron, quiero cotizar/comprar estos productos:",
      "",
      ...cartItems.map((row) => {
        const finalUnit = safeDiscountPrice(row.product.price, row.product.discountPct);
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
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
        No hay productos publicados por ahora.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visibleProducts.map((product) => {
          const qty = qtyById[product.id] || 0;
          const finalUnit = safeDiscountPrice(product.price, product.discountPct);
          const imageUrl = product.imageUrl?.trim();
          return (
            <article key={product.id} className="card-premium flex flex-col p-5">
              {imageUrl ? (
                <div className="mb-4 overflow-hidden rounded-xl border border-slate-100 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="h-44 w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="mb-4 flex h-44 items-center justify-center rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-slate-100 text-xs font-semibold text-slate-500">
                  Imagen pendiente
                </div>
              )}

              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold leading-snug text-slate-900">{product.name}</h3>
                {product.featured ? (
                  <span className="shrink-0 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                    Destacado
                  </span>
                ) : null}
              </div>

              <p className="text-xs leading-relaxed text-slate-500">{product.publicDescription || product.description}</p>

              <ul className="mt-3 space-y-1 text-xs text-slate-600">
                {product.badges.map((badge) => (
                  <li key={`${product.id}-${badge}`} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                    <span>{badge}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  <span>Stock disponible: {product.stock}</span>
                </li>
              </ul>

              <div className="mt-4 space-y-2">
                {product.discountPct > 0 ? (
                  <p className="text-xs text-slate-400 line-through">{currencyCLP(product.price)}</p>
                ) : null}
                <p className="text-xl font-extrabold text-slate-900">{currencyCLP(finalUnit)}</p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
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
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-700" />
              <h4 className="text-sm font-bold text-slate-900">Carrito de productos</h4>
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
            <p className="text-sm text-slate-500">Aún no agregas productos al carrito.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {cartItems.map((row) => {
                const finalUnit = safeDiscountPrice(row.product.price, row.product.discountPct);
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
            Enviar pedido por WhatsApp <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
