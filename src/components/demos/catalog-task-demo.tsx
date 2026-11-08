"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag } from "lucide-react";
import { clp } from "@/config/pricing";
import { trackAnalyticsEvent } from "@/lib/analytics/google-ads";

const products = [
  { id: "camisa", name: "Camisa de algodón", category: "Vestuario", amount: 24990 },
  { id: "poleron", name: "Polerón azul", category: "Vestuario", amount: 32990 },
  { id: "bolso", name: "Bolso de viaje", category: "Accesorios", amount: 19990 },
] as const;

export function CatalogTaskDemo() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState(false);
  const [started, setStarted] = useState(false);
  const selected = products.filter((p) => cart[p.id]);
  const total = selected.reduce((sum, p) => sum + p.amount * cart[p.id], 0);
  function start() {
    if (started) return;
    setStarted(true);
    trackAnalyticsEvent("demo_open", {
      service_line: "web_ecommerce",
      page_path: "/demos",
      demo_id: "catalogo_pedido",
    });
  }
  return (
    <section
      id="probar-catalogo"
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-8"
      onFocusCapture={start}
    >
      <p className="text-xs font-bold tracking-widest text-blue-700 uppercase">
        Demostración interactiva · datos ficticios
      </p>
      <h2 className="mt-3 text-2xl font-bold text-slate-950">
        Busca un producto y prepara un pedido.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        Prueba el recorrido de un catálogo WhatsApp. Los productos y precios son de ejemplo. La
        selección solo existe en esta pantalla: no se envía a ningún negocio ni realiza cobros.
      </p>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <label htmlFor="demo-search" className="text-sm font-semibold text-slate-800">
            1. Busca en el catálogo
          </label>
          <div className="relative mt-2">
            <Search aria-hidden="true" className="absolute top-3 left-3 h-5 w-5 text-slate-500" />
            <input
              id="demo-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Por ejemplo: polerón"
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pr-3 pl-10 text-slate-900"
            />
          </div>
          <ul className="mt-4 divide-y divide-slate-200">
            {products
              .filter((p) =>
                `${p.name} ${p.category}`
                  .toLocaleLowerCase("es")
                  .includes(query.trim().toLocaleLowerCase("es")),
              )
              .map((product) => (
                <li
                  key={product.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900">{product.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {clp(product.amount)} · precio de ejemplo
                    </p>
                  </div>
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-blue-700 px-4 text-sm font-bold text-blue-700 hover:bg-blue-50"
                    onClick={() => {
                      setSummary(false);
                      setCart({ ...cart, [product.id]: Math.min((cart[product.id] || 0) + 1, 99) });
                    }}
                    aria-label={`Agregar ${product.name}`}
                  >
                    Agregar
                  </button>
                </li>
              ))}
          </ul>
          {!products.some((p) =>
            `${p.name} ${p.category}`
              .toLocaleLowerCase("es")
              .includes(query.trim().toLocaleLowerCase("es")),
          ) && (
            <p role="status" className="py-5 text-sm text-slate-600">
              Sin coincidencias. Prueba con «camisa», «polerón» o «bolso».
            </p>
          )}
        </div>
        <div className="rounded-xl bg-slate-50 p-5">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <ShoppingBag className="h-5 w-5" />
            2. Revisa tu selección
          </h3>
          <div aria-live="polite" className="mt-4 space-y-3 text-sm text-slate-700">
            {selected.length ? (
              selected.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <span>
                    {cart[p.id]} × {p.name}
                  </span>
                  <button
                    type="button"
                    aria-label={`Quitar una unidad de ${p.name}`}
                    className="min-h-11 px-2 font-semibold text-blue-700 underline"
                    onClick={() => {
                      setSummary(false);
                      setCart({ ...cart, [p.id]: cart[p.id] - 1 });
                    }}
                  >
                    Quitar
                  </button>
                </div>
              ))
            ) : (
              <p>Agrega un producto para preparar la consulta.</p>
            )}
            <p className="border-t border-slate-200 pt-3 font-bold">
              Total de ejemplo: {clp(total)}
            </p>
          </div>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => setSummary(true)}
            className="mt-5 min-h-11 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:bg-slate-600 disabled:opacity-70"
          >
            3. Preparar consulta de ejemplo
          </button>
          {summary && (
            <div
              role="status"
              className="mt-4 rounded-lg border border-blue-200 bg-white p-4 text-sm leading-7 text-slate-700"
            >
              <strong>Consulta preparada, sin enviar.</strong>
              <p>
                Hola, me interesan: {selected.map((p) => `${cart[p.id]} × ${p.name}`).join(", ")}.
                ¿Pueden confirmar disponibilidad y entrega?
              </p>
              <p className="mt-2">
                En un catálogo contratado, el siguiente paso abre WhatsApp para que el cliente
                revise y envíe el mensaje. Un ecommerce agrega pago y gestión del pedido según
                alcance.
              </p>
            </div>
          )}
          <Link
            href="/contacto?plan=catalogo&origen=demo-catalogo"
            className="mt-5 inline-block text-sm font-bold text-blue-700 underline"
          >
            Cotizar un catálogo para mi negocio
          </Link>
        </div>
      </div>
    </section>
  );
}
