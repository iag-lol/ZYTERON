"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Loader2, MessageSquare, Minus, Plus, Send, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PublicDiscount, PublicExtra, PublicPlan, PublicReview } from "@/lib/web-control-types";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | { status: "error"; message: string };

type ReviewSubmitState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | { status: "error"; message: string };

type BuilderProps = {
  plans: PublicPlan[];
  extras: PublicExtra[];
  discounts: PublicDiscount[];
  reviews: PublicReview[];
  showReviewsSection?: boolean;
};

type CartDiscount = {
  id: string;
  name: string;
  amount: number;
};

type CategoryStyle = {
  label: string;
  bg: string;
  pill: string;
};

const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  DOMAIN: { label: "Infraestructura", bg: "bg-blue-50", pill: "bg-blue-100 text-blue-700" },
  EMAIL: { label: "Correos corporativos", bg: "bg-emerald-50", pill: "bg-emerald-100 text-emerald-700" },
  SEO: { label: "SEO y marketing", bg: "bg-violet-50", pill: "bg-violet-100 text-violet-700" },
  SUPPORT: { label: "Soporte técnico", bg: "bg-amber-50", pill: "bg-amber-100 text-amber-700" },
  TECH: { label: "Funcionalidades", bg: "bg-rose-50", pill: "bg-rose-100 text-rose-700" },
  DESIGN: { label: "Ecommerce y pagos", bg: "bg-cyan-50", pill: "bg-cyan-100 text-cyan-700" },
  EQUIPMENT: { label: "Equipos y hardware", bg: "bg-indigo-50", pill: "bg-indigo-100 text-indigo-700" },
  TRAINING: { label: "Capacitación", bg: "bg-pink-50", pill: "bg-pink-100 text-pink-700" },
};

const IVA_RATE = 0.19;

function currencyCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

function formatDate(value?: string | null) {
  if (!value) return "Reciente";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Reciente";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function groupedExtras(extras: PublicExtra[]) {
  const groups = new Map<string, PublicExtra[]>();
  for (const extra of extras) {
    const category = String(extra.category || "TECH").toUpperCase();
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category)?.push(extra);
  }
  return Array.from(groups.entries())
    .map(([category, items]) => ({ category, items }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

function isDiscountActive(discount: PublicDiscount) {
  if (discount.active === false) return false;
  const now = Date.now();
  const startsAt = discount.startsAt ? new Date(discount.startsAt).getTime() : null;
  const endsAt = discount.endsAt ? new Date(discount.endsAt).getTime() : null;
  if (startsAt && !Number.isNaN(startsAt) && startsAt > now) return false;
  if (endsAt && !Number.isNaN(endsAt) && endsAt < now) return false;
  return true;
}

function applyDiscounts(
  discounts: PublicDiscount[],
  plan: PublicPlan | null,
  selectedExtras: Array<{ extra: PublicExtra; quantity: number }>,
  subtotal: number,
) {
  if (!plan) return [] as CartDiscount[];
  if (subtotal <= 0) return [] as CartDiscount[];

  const applied: CartDiscount[] = [];
  for (const discount of discounts) {
    if (!isDiscountActive(discount)) continue;
    if (typeof discount.minSubtotal === "number" && subtotal < discount.minSubtotal) continue;

    let applicableBase = 0;
    if (discount.targetType === "PLAN") {
      if (discount.targetId && discount.targetId !== plan.id) continue;
      applicableBase = plan.price;
    } else if (discount.targetType === "EXTRA") {
      const matched = selectedExtras
        .filter((item) => !discount.targetId || item.extra.id === discount.targetId)
        .reduce((acc, item) => acc + item.extra.price * item.quantity, 0);
      if (matched <= 0) continue;
      applicableBase = matched;
    } else if (discount.targetType === "ORDER") {
      applicableBase = subtotal;
    } else {
      continue;
    }

    if (applicableBase <= 0) continue;

    let amount = 0;
    if (discount.mode === "PERCENT") {
      amount = applicableBase * (discount.value / 100);
    } else if (discount.mode === "FIXED") {
      amount = discount.value;
    }

    if (amount <= 0) continue;
    applied.push({
      id: discount.id,
      name: discount.name,
      amount: Math.max(0, Math.round(amount)),
    });
  }

  return applied;
}

function buildCartSummaryText(input: {
  selectedPlan: PublicPlan | null;
  selectedExtras: Array<{ extra: PublicExtra; quantity: number }>;
  appliedDiscounts: CartDiscount[];
  subtotal: number;
  discountTotal: number;
  iva: number;
  total: number;
  form: {
    name: string;
    email: string;
    phone: string;
    company: string;
    service: string;
    message: string;
  };
}) {
  const {
    selectedPlan,
    selectedExtras,
    appliedDiscounts,
    subtotal,
    discountTotal,
    iva,
    total,
    form,
  } = input;

  const extrasLines = selectedExtras.map(
    (item) => `- ${item.extra.name} x${item.quantity}: ${currencyCLP(item.extra.price * item.quantity)}`,
  );
  const discountLines = appliedDiscounts.map(
    (discount) => `- ${discount.name}: -${currencyCLP(discount.amount)}`,
  );

  const lines = [
    "Hola Zyteron, quiero cotizar con este detalle:",
    "",
    `Plan base: ${selectedPlan?.name || "Sin plan"} (${currencyCLP(selectedPlan?.price || 0)})`,
    `Extras (${selectedExtras.length}):`,
    ...(extrasLines.length > 0 ? extrasLines : ["- Sin extras"]),
    "",
    "Resumen financiero:",
    `- Subtotal: ${currencyCLP(subtotal)}`,
    ...(discountLines.length > 0 ? discountLines : []),
    `- Descuento total: ${currencyCLP(discountTotal)}`,
    `- IVA (19%): ${currencyCLP(iva)}`,
    `- Total final: ${currencyCLP(total)}`,
    "",
    "Datos de contacto:",
    `- Nombre: ${form.name.trim() || "No informado"}`,
    `- Empresa: ${form.company.trim() || "No informada"}`,
    `- Email: ${form.email.trim() || "No informado"}`,
    `- Teléfono: ${form.phone.trim() || "No informado"}`,
    `- Servicio: ${form.service.trim() || "No especificado"}`,
    form.message.trim() ? `- Necesidad: ${form.message.trim()}` : "",
  ].filter(Boolean);

  return lines.join("\n");
}

export function PackageBuilder({ plans, extras, discounts, reviews, showReviewsSection = true }: BuilderProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[1]?.id || plans[0]?.id || "");
  const [extraQtyById, setExtraQtyById] = useState<Record<string, number>>({});
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [reviewState, setReviewState] = useState<ReviewSubmitState>({ status: "idle" });
  const [submitting, setSubmitting] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [rating, setRating] = useState(5);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    service: "",
    message: "",
  });

  const [reviewForm, setReviewForm] = useState({
    name: "",
    email: "",
    company: "",
    service: "",
    comment: "",
  });

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null,
    [plans, selectedPlanId],
  );

  const selectedExtras = useMemo(
    () =>
      extras
        .map((extra) => ({
          extra,
          quantity: extraQtyById[extra.id] || 0,
        }))
        .filter((item) => item.quantity > 0),
    [extras, extraQtyById],
  );

  const subtotal = useMemo(() => {
    const planPrice = selectedPlan?.price || 0;
    const extrasTotal = selectedExtras.reduce((acc, item) => acc + item.extra.price * item.quantity, 0);
    return planPrice + extrasTotal;
  }, [selectedExtras, selectedPlan]);

  const appliedDiscounts = useMemo(
    () => applyDiscounts(discounts, selectedPlan, selectedExtras, subtotal),
    [discounts, selectedPlan, selectedExtras, subtotal],
  );

  const discountTotal = useMemo(
    () => appliedDiscounts.reduce((acc, item) => acc + item.amount, 0),
    [appliedDiscounts],
  );

  const neto = Math.max(0, subtotal - discountTotal);
  const iva = Math.round(neto * IVA_RATE);
  const total = neto + iva;

  const canSubmit = Boolean(selectedPlan) && Boolean(form.name.trim()) && Boolean(form.email.trim());

  const extrasByCategory = useMemo(() => groupedExtras(extras), [extras]);
  const whatsappMessage = useMemo(
    () =>
      buildCartSummaryText({
        selectedPlan,
        selectedExtras,
        appliedDiscounts,
        subtotal,
        discountTotal,
        iva,
        total,
        form,
      }),
    [appliedDiscounts, discountTotal, form, iva, selectedExtras, selectedPlan, subtotal, total],
  );
  const whatsappHref = `https://wa.me/56984752936?text=${encodeURIComponent(whatsappMessage)}`;

  const updateQty = (extraId: string, next: number) => {
    setExtraQtyById((prev) => {
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[extraId];
        return copy;
      }
      return {
        ...prev,
        [extraId]: Math.min(99, Math.max(1, Math.round(next))),
      };
    });
  };

  const toggleExtra = (extraId: string) => {
    const current = extraQtyById[extraId] || 0;
    updateQty(extraId, current > 0 ? 0 : 1);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPlan) return;
    if (!canSubmit) {
      setSubmitState({ status: "error", message: "Completa nombre y email para enviar tu cotización." });
      return;
    }

    setSubmitting(true);
    setSubmitState({ status: "idle" });

    const serviceSummary =
      form.service.trim() ||
      `Cotizador web: ${selectedPlan.name} + ${selectedExtras.length} extra(s) · Total ${currencyCLP(total)}`;

    const response = await fetch("/api/cotizador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        service: serviceSummary,
        planName: selectedPlan.name,
        planPrice: selectedPlan.price,
        extras: selectedExtras.map((item) => ({
          id: item.extra.id,
          name: item.extra.name,
          price: item.extra.price,
          quantity: item.quantity,
        })),
        subtotal,
        discountTotal,
        iva,
        total,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      reference?: string;
    };

    if (!response.ok || !payload.ok) {
      setSubmitState({
        status: "error",
        message: payload.error || "No se pudo enviar la cotización. Intenta nuevamente.",
      });
      setSubmitting(false);
      return;
    }

    setSubmitState({ status: "success", reference: payload.reference || "RECIBIDO" });
    setSubmitting(false);
    setForm({
      name: "",
      email: "",
      phone: "",
      company: "",
      service: "",
      message: "",
    });
  }

  async function handleReviewSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewForm.name.trim() || reviewForm.comment.trim().length < 10) {
      setReviewState({ status: "error", message: "Completa tu nombre y un comentario más detallado." });
      return;
    }

    setSubmittingReview(true);
    setReviewState({ status: "idle" });

    const response = await fetch("/api/comentarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...reviewForm,
        rating,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      reference?: string;
    };

    if (!response.ok || !payload.ok) {
      setReviewState({
        status: "error",
        message: payload.error || "No se pudo enviar tu comentario.",
      });
      setSubmittingReview(false);
      return;
    }

    setReviewState({ status: "success", reference: payload.reference || "RECIBIDO" });
    setSubmittingReview(false);
    setReviewForm({
      name: "",
      email: "",
      company: "",
      service: "",
      comment: "",
    });
    setRating(5);
  }

  return (
    <div className="space-y-16">
      <section className="py-14 section-alt border-b border-slate-200">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            { num: "01", title: "Selecciona plan base", desc: "Elige entre PYME Básico, PYME Medio o PYME Avanzado según tu objetivo." },
            { num: "02", title: "Agrega extras", desc: "Usa los botones para sumar funcionalidades y servicios." },
            { num: "03", title: "Envía la solicitud", desc: "Tu carrito llega al admin con el resumen completo." },
          ].map((step) => (
            <div key={step.num} className="card-premium border-t-4 border-t-blue-300 p-6 space-y-3">
              <span className="text-4xl font-black text-blue-600/20">{step.num}</span>
              <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Paso 1</p>
          <h2 className="text-2xl font-extrabold text-slate-900">Elige tu plan base</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const active = selectedPlan?.id === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlanId(plan.id)}
                className={`rounded-2xl border p-6 text-left transition-all ${
                  active
                    ? "border-blue-400 bg-blue-600 text-white shadow-xl shadow-blue-500/20"
                    : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-md"
                }`}
              >
                <div className="space-y-2">
                  <p className={`text-xs font-bold uppercase tracking-widest ${active ? "text-blue-100" : "text-slate-400"}`}>
                    {plan.name}
                  </p>
                  <p className={`text-3xl font-extrabold ${active ? "text-white" : "text-slate-900"}`}>
                    {currencyCLP(plan.price)}
                  </p>
                  <p className={`text-sm ${active ? "text-blue-100" : "text-slate-600"}`}>{plan.description}</p>
                </div>
                <div className="mt-5 space-y-2">
                  {plan.features.slice(0, 3).map((feature) => (
                    <div key={feature} className={`flex items-start gap-2 text-xs ${active ? "text-blue-100" : "text-slate-600"}`}>
                      <Check className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${active ? "text-blue-200" : "text-blue-600"}`} />
                      {feature}
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className={`text-xs font-bold ${active ? "text-blue-100" : "text-slate-500"}`}>
                    {plan.popular ? "Más elegido" : "Disponible"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                      active ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"
                    }`}
                  >
                    {active ? "Seleccionado" : "Elegir"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-8">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Paso 2</p>
          <h2 className="text-2xl font-extrabold text-slate-900">Agrega extras con botones</h2>
          <p className="text-sm text-slate-600">Cada selección entra al carrito final en tiempo real.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {extrasByCategory.map((group) => {
            const style = CATEGORY_STYLES[group.category] || {
              label: group.category,
              bg: "bg-slate-50",
              pill: "bg-slate-100 text-slate-700",
            };

            return (
              <div key={group.category} className="card-premium overflow-hidden">
                <div className={`flex items-center justify-between gap-3 border-b border-slate-100 p-4 ${style.bg}`}>
                  <p className="text-sm font-bold text-slate-900">{style.label}</p>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${style.pill}`}>{group.items.length} opciones</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {group.items.map((extra) => {
                    const qty = extraQtyById[extra.id] || 0;
                    const selected = qty > 0;
                    return (
                      <div key={extra.id} className="space-y-2 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{extra.name}</p>
                            <p className="text-xs text-slate-500">{extra.description}</p>
                          </div>
                          <p className="text-sm font-bold text-slate-900">{currencyCLP(extra.price)}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => toggleExtra(extra.id)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                              selected
                                ? "bg-slate-900 text-white hover:bg-slate-700"
                                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                            }`}
                          >
                            {selected ? "Quitar del carrito" : "Agregar al carrito"}
                          </button>
                          {selected ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateQty(extra.id, qty - 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-5 text-center text-sm font-semibold text-slate-700">{qty}</span>
                              <button
                                type="button"
                                onClick={() => updateQty(extra.id, qty + 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Paso 3</p>
            <h3 className="text-xl font-extrabold text-slate-900">Enviar cotización al equipo comercial</h3>
            <p className="text-sm text-slate-500">Esta solicitud llega al panel admin en la sección Contactos con el resumen de servicios.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="builder-name">Nombre completo</Label>
              <Input
                id="builder-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Tu nombre"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="builder-email">Email</Label>
              <Input
                id="builder-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="correo@empresa.cl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="builder-phone">Teléfono</Label>
              <Input
                id="builder-phone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="+56 9..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="builder-company">Empresa</Label>
              <Input
                id="builder-company"
                value={form.company}
                onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
                placeholder="Empresa SpA"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="builder-service">Resumen de servicio (editable)</Label>
            <Input
              id="builder-service"
              value={form.service}
              onChange={(event) => setForm((prev) => ({ ...prev, service: event.target.value }))}
              placeholder="Sitio corporativo + SEO + soporte mensual"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="builder-message">Contexto de la necesidad</Label>
            <Textarea
              id="builder-message"
              rows={4}
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="Cuéntanos plazos, objetivos y prioridades..."
            />
          </div>

          <Button type="submit" disabled={!canSubmit || submitting} className="w-full gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                Enviar al admin <Send className="h-4 w-4" />
              </>
            )}
          </Button>

          {submitState.status === "success" ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Solicitud enviada con éxito. Código: <strong>{submitState.reference}</strong>.
            </div>
          ) : null}

          {submitState.status === "error" ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {submitState.message}
            </div>
          ) : null}
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-700" />
              <h4 className="text-sm font-bold text-slate-900">Carrito final</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-600">{selectedPlan?.name || "Sin plan"}</span>
                <span className="font-semibold text-slate-900">{currencyCLP(selectedPlan?.price || 0)}</span>
              </div>
              {selectedExtras.map((item) => (
                <div key={item.extra.id} className="flex items-start justify-between gap-2">
                  <span className="text-slate-600">{item.extra.name} x{item.quantity}</span>
                  <span className="font-semibold text-slate-900">{currencyCLP(item.extra.price * item.quantity)}</span>
                </div>
              ))}
              {selectedExtras.length === 0 ? (
                <p className="text-xs text-slate-500">No has agregado extras todavía.</p>
              ) : null}
            </div>
            <div className="my-4 border-t border-slate-200" />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-900">{currencyCLP(subtotal)}</span>
              </div>
              {appliedDiscounts.map((discount) => (
                <div key={discount.id} className="flex justify-between">
                  <span className="text-emerald-700">{discount.name}</span>
                  <span className="font-semibold text-emerald-700">-{currencyCLP(discount.amount)}</span>
                </div>
              ))}
              <div className="mt-2 flex justify-between">
                <span className="text-slate-500">IVA (19%)</span>
                <span className="font-semibold text-slate-900">{currencyCLP(iva)}</span>
              </div>
            </div>
            <div className="my-4 border-t-2 border-slate-200" />
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900">Total</span>
              <span className="text-xl font-extrabold text-blue-700">{currencyCLP(total)}</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              El resumen viaja al panel admin para seguimiento comercial y operativo.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Canal rápido</p>
            <p className="mt-1 text-sm text-slate-600">
              Envía por WhatsApp exactamente el carrito que armaste, con plan, extras y totales.
            </p>
            <Button asChild className="mt-4 w-full gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700">
              <Link
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                Enviar detalle por WhatsApp <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <p className="text-[11px] font-semibold text-slate-500">Vista previa del mensaje:</p>
              <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap text-[10px] leading-relaxed text-slate-600">
                {whatsappMessage}
              </pre>
            </div>
          </div>
        </aside>
      </section>

      {showReviewsSection ? (
        <section className="space-y-6 border-t border-slate-200 pt-10">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Comentarios de clientes</p>
            <h3 className="text-2xl font-extrabold text-slate-900">Opiniones verificadas</h3>
            <p className="text-sm text-slate-600">Las reseñas nuevas quedan pendientes hasta que las apruebes desde admin.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              {reviews.length === 0 ? (
                <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                  Aún no hay comentarios aprobados.
                </div>
              ) : (
                reviews.slice(0, 6).map((review) => (
                  <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">{review.name}</p>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={`${review.id}-star-${index + 1}`}
                            className={`h-3.5 w-3.5 ${index < review.rating ? "fill-current" : "text-slate-300"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.comment}</p>
                    <p className="mt-3 text-xs text-slate-400">
                      {review.company || "Cliente Zyteron"} · {formatDate(review.createdAt)}
                    </p>
                  </article>
                ))
              )}
            </div>

            <form onSubmit={handleReviewSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-700" />
                <h4 className="text-base font-bold text-slate-900">Deja tu comentario</h4>
              </div>
              <p className="mt-1 text-xs text-slate-500">Se registrará con estado pendiente para moderación.</p>

              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <Label>Calificación</Label>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      return (
                        <button
                          key={`set-rating-${value}`}
                          type="button"
                          onClick={() => setRating(value)}
                          className="text-amber-500 transition-opacity hover:opacity-80"
                        >
                          <Star className={`h-5 w-5 ${value <= rating ? "fill-current" : "text-slate-300"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="review-name">Nombre</Label>
                    <Input
                      id="review-name"
                      value={reviewForm.name}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="review-company">Empresa</Label>
                    <Input
                      id="review-company"
                      value={reviewForm.company}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, company: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="review-email">Email</Label>
                    <Input
                      id="review-email"
                      type="email"
                      value={reviewForm.email}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="review-service">Servicio</Label>
                    <Input
                      id="review-service"
                      value={reviewForm.service}
                      onChange={(event) => setReviewForm((prev) => ({ ...prev, service: event.target.value }))}
                      placeholder="Ej: Desarrollo web + SEO"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="review-comment">Comentario</Label>
                  <Textarea
                    id="review-comment"
                    rows={4}
                    value={reviewForm.comment}
                    onChange={(event) => setReviewForm((prev) => ({ ...prev, comment: event.target.value }))}
                    placeholder="¿Cómo fue tu experiencia con Zyteron?"
                    required
                  />
                </div>

                <Button type="submit" disabled={submittingReview} className="w-full gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
                  {submittingReview ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar comentario <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                {reviewState.status === "success" ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    Comentario enviado. Código: <strong>{reviewState.reference}</strong>.
                  </div>
                ) : null}

                {reviewState.status === "error" ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {reviewState.message}
                  </div>
                ) : null}
              </div>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
