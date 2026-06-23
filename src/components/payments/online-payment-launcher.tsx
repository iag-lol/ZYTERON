"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackBeginCheckout } from "@/lib/analytics/google-ads";
import type { ServicePaymentItem } from "@/lib/payments/service-catalog";

type SubmitState =
  | { status: "idle" }
  | { status: "error"; message: string };

type Props = {
  items: ServicePaymentItem[];
};

export function OnlinePaymentLauncher({ items }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const disabled = useMemo(() => !name.trim() || !email.trim(), [name, email]);

  async function handleStartPayment(item: ServicePaymentItem) {
    if (disabled) {
      setSubmitState({ status: "error", message: "Ingresa nombre y correo para continuar con el pago." });
      return;
    }

    setSubmitState({ status: "idle" });
    setLoadingKey(item.key);
    trackBeginCheckout({
      page_path: window.location.pathname,
      service_key: item.key,
      checkout_type: item.mode,
    });

    const endpoint =
      item.mode === "subscription"
        ? "/api/payments/subscription/start"
        : "/api/payments/service/create";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceKey: item.key,
        buyerName: name.trim(),
        buyerEmail: email.trim(),
        buyerPhone: phone.trim(),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      checkoutUrl?: string;
      redirectUrl?: string;
    };

    if (!response.ok || !payload.ok) {
      setSubmitState({
        status: "error",
        message: payload.error || "No se pudo iniciar el flujo de pago. Intenta nuevamente.",
      });
      setLoadingKey(null);
      return;
    }

    const url = payload.checkoutUrl || payload.redirectUrl;
    if (!url) {
      setSubmitState({
        status: "error",
        message: "No se recibió URL de pago. Intenta nuevamente.",
      });
      setLoadingKey(null);
      return;
    }

    window.location.assign(url);
  }

  return (
    <div className="card-premium p-6">
      <h3 className="text-xl font-extrabold text-slate-900">Pago online de servicios habilitados</h3>
      <p className="mt-1 text-sm text-slate-600">
        Disponible para diagnóstico, reserva, mensualidades y pagos aprobados. Para desarrollos personalizados, primero cotización.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="payer-name">Nombre</Label>
          <Input
            id="payer-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Tu nombre"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="payer-email">Correo</Label>
          <Input
            id="payer-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="correo@empresa.cl"
          />
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="payer-phone">WhatsApp (opcional)</Label>
        <Input
          id="payer-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+56939526626"
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-900">{item.title}</p>
            <p className="mt-1 text-xs text-slate-600">{item.description}</p>
            <p className="mt-2 text-xs font-semibold text-blue-700">{item.priceLabel}</p>
            <Button
              type="button"
              className="mt-3 w-full gap-2 bg-blue-700 text-white hover:bg-blue-800"
              onClick={() => handleStartPayment(item)}
              disabled={Boolean(loadingKey)}
            >
              {loadingKey === item.key ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirigiendo...
                </>
              ) : (
                <>
                  {item.cta} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </article>
        ))}
      </div>

      {submitState.status === "error" ? (
        <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {submitState.message}
        </div>
      ) : null}

      <p className="mt-4 text-xs text-slate-500">
        Valores base sujetos a evaluación. El pago de abono se habilita cuando existe cotización aprobada.
      </p>
    </div>
  );
}
