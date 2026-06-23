"use client";

import { useState, useTransition } from "react";
import { ShoppingCart, CheckCircle2, ChevronRight, Store, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PublicPlan, PublicExtra, PublicProduct } from "@/lib/web-control-types";
import { formatRut } from "@/lib/checkout/rut";
import { trackBeginCheckout } from "@/lib/analytics/google-ads";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export function PortalStore({
  plans,
  extras,
  products,
  user,
}: {
  plans: PublicPlan[];
  extras: PublicExtra[];
  products: PublicProduct[];
  user: {
    name: string;
    email: string;
    phone: string;
    rut: string;
    address: string;
  };
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Checkout form state
  const [form, setForm] = useState({
    buyerName: user.name || "",
    buyerEmail: user.email || "",
    buyerPhone: user.phone || "",
    buyerRut: user.rut || "",
    address: user.address || "",
    documentType: "BOLETA" as "BOLETA" | "FACTURA",
    companyName: "",
    companyRut: "",
  });
  const [errorMsg, setErrorMsg] = useState("");

  const cartTotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  function addToCart(item: { id: string; name: string; price: number }) {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) => (p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setIsCartOpen(true);
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    if (cart.length === 0) return;
    trackBeginCheckout({
      page_path: window.location.pathname,
      items_count: cart.length,
      value: cartTotal,
      currency: "CLP",
      checkout_type: "portal_store",
    });

    startTransition(async () => {
      try {
        const res = await fetch("/api/checkout/flow/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((c) => ({ productId: c.id, quantity: c.quantity })),
            checkout: {
              ...form,
              buyerRut: formatRut(form.buyerRut),
              companyRut: form.companyRut ? formatRut(form.companyRut) : undefined,
            },
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error || "Error al procesar el pago.");
          return;
        }

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } catch {
        setErrorMsg("Error de conexión al iniciar el pago.");
      }
    });
  }

  const formatCLP = (val: number) =>
    new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(val);

  return (
    <div className="mt-12 space-y-8">
      {/* ── Tienda Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <Store className="h-6 w-6 text-blue-600" />
            Tienda y Servicios
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Mejora tu presencia online, contrata extensiones o adquiere nuevos planes.
          </p>
        </div>
        <Button
          onClick={() => setIsCartOpen(true)}
          className="relative rounded-xl bg-blue-700 px-5 text-white hover:bg-blue-800"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Mi Carrito ({cart.reduce((acc, c) => acc + c.quantity, 0)})
        </Button>
      </div>

      {/* ── Planes Web ── */}
      <section>
        <h3 className="mb-4 text-lg font-bold text-slate-900">Planes Web</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
              <div className="mb-4">
                <span className="mb-2 inline-block rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                  {plan.tier}
                </span>
                <h4 className="text-xl font-bold text-slate-900">{plan.name}</h4>
                <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
              </div>
              <div className="mb-6 flex-1">
                <p className="text-2xl font-black text-slate-900">{formatCLP(plan.price)}</p>
                <ul className="mt-4 space-y-2 text-sm text-slate-600">
                  {plan.features.slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                onClick={() => addToCart({ id: plan.id, name: plan.name, price: plan.price })}
                variant="outline"
                className="w-full justify-between rounded-xl border-slate-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
              >
                Agregar al carrito
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mejoras (Extras) ── */}
      <section>
        <h3 className="mb-4 text-lg font-bold text-slate-900">Mejoras para tu Web (Add-ons)</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {extras.map((extra) => (
            <div key={extra.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300">
              <h4 className="font-semibold text-slate-900 line-clamp-1">{extra.name}</h4>
              <p className="mt-1 flex-1 text-xs text-slate-500 line-clamp-2">{extra.description}</p>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <p className="font-bold text-slate-900">{formatCLP(extra.price)}</p>
                <Button
                  onClick={() => addToCart({ id: extra.id, name: extra.name, price: extra.price })}
                  size="sm"
                  className="rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                >
                  Agregar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Productos ── */}
      {products.length > 0 && (
        <section>
          <h3 className="mb-4 text-lg font-bold text-slate-900">Equipos y Software</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <div key={product.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-300">
                <h4 className="font-semibold text-slate-900 line-clamp-1">{product.name}</h4>
                <p className="mt-1 flex-1 text-xs text-slate-500 line-clamp-2">{product.description}</p>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <p className="font-bold text-slate-900">{formatCLP(product.price)}</p>
                  <Button
                    onClick={() => addToCart({ id: product.id, name: product.name, price: product.price })}
                    size="sm"
                    className="rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                  >
                    Agregar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Carrito Dialog ── */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tu Carrito de Compras</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            {cart.length === 0 ? (
              <p className="text-center text-sm text-slate-500">El carrito está vacío.</p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        {item.quantity} x {formatCLP(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-bold text-slate-900">{formatCLP(item.price * item.quantity)}</p>
                      <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="font-bold text-slate-900">Total</span>
                  <span className="text-lg font-black text-blue-700">{formatCLP(cartTotal)}</span>
                </div>
                <Button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700"
                >
                  Ir a Pagar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Checkout Dialog ── */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Pago Online Seguro
            </DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-600">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleCheckout} className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nombre</label>
                <Input required value={form.buyerName} onChange={(e) => setForm({ ...form, buyerName: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Email</label>
                <Input required type="email" value={form.buyerEmail} onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">RUT Comprador</label>
                <Input required value={form.buyerRut} onChange={(e) => setForm({ ...form, buyerRut: e.target.value })} placeholder="12.345.678-9" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Teléfono</label>
                <Input value={form.buyerPhone} onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Dirección</label>
              <Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>

            <div className="space-y-1 pt-2">
              <label className="text-xs font-semibold text-slate-700">Tipo de Documento</label>
              <select
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.documentType}
                onChange={(e) => setForm({ ...form, documentType: e.target.value as "BOLETA" | "FACTURA" })}
              >
                <option value="BOLETA">Boleta Electrónica</option>
                <option value="FACTURA">Factura Electrónica</option>
              </select>
            </div>

            {form.documentType === "FACTURA" && (
              <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Razón Social</label>
                  <Input required value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">RUT Empresa</label>
                  <Input required value={form.companyRut} onChange={(e) => setForm({ ...form, companyRut: e.target.value })} placeholder="76.543.210-K" />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="mt-6 w-full rounded-xl bg-blue-700 py-6 text-lg hover:bg-blue-800"
            >
              {pending ? "Procesando..." : `Pagar ${formatCLP(cartTotal)}`}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
