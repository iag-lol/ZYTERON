"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Landmark,
  Loader2,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ZYTERON_COMPANY } from "@/lib/company";
import { quotePaymentIsMarkedPaidInAdmin, quotePaymentVisibleInPortal } from "@/lib/payments/quote-payments";

type QuoteStage = {
  key: "FULL" | "DELIVERY" | "INITIAL" | "FINAL";
  label: string;
  amount: number;
  paymentChannel: "FLOW" | "TRANSFER";
  status: "PENDING" | "READY" | "PROCESSING" | "PAID" | "PENDING_TRANSFER_REVIEW" | "REJECTED";
  dueEnabled?: boolean;
  dueLabel?: string;
  paidAt?: string;
  transferProofs?: Array<{
    id: string;
    amount: number;
    uploadedAt: string;
    fileUrl?: string;
    fileName?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED";
  }>;
};

type QuoteItem = {
  id: string;
  displayNumber: string;
  status: string;
  totalAmount: number;
  pdfUrl: string;
  payment?: {
    billingType?: "ONE_TIME" | "SUBSCRIPTION";
    totalPaid?: number;
    totalPending?: number;
    alertStatus?: "PENDING" | "PAID" | "TRANSFER_REVIEW";
    subscription?: {
      interval?: "MONTHLY";
      amount?: number;
      status?: "PENDING" | "ACTIVE" | "FAILED";
      nextInvoiceDate?: string;
      lastError?: string;
    };
    stages?: QuoteStage[];
  };
};

type Props = {
  quotes: QuoteItem[];
  paymentResult?: "paid" | "pending" | "error" | null;
  paymentMessage?: string | null;
  paymentLabel?: string | null;
};

type LegalAcceptancePayload = {
  acceptTerms: true;
  acceptPrivacy: true;
};

type PaymentModalState = {
  quoteId: string;
  stageKey: QuoteStage["key"];
  mode: "FLOW" | "SUBSCRIPTION";
} | null;

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function statusStyles(status: QuoteStage["status"]) {
  switch (status) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PENDING_TRANSFER_REVIEW":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "REJECTED":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "PROCESSING":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "READY":
      return "border-sky-200 bg-sky-50 text-sky-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function stageStatusLabel(status: QuoteStage["status"]) {
  switch (status) {
    case "PAID":
      return "Pagado";
    case "PENDING_TRANSFER_REVIEW":
      return "Comprobante en revisión";
    case "REJECTED":
      return "Pago rechazado";
    case "PROCESSING":
      return "Pago en proceso";
    case "READY":
      return "Listo para pago";
    default:
      return "Pendiente";
  }
}

function canShowFlowPayment(stage: QuoteStage) {
  return stage.paymentChannel === "FLOW" && stage.dueEnabled && ["READY", "REJECTED", "PROCESSING"].includes(stage.status);
}

function canShowTransferPayment(stage: QuoteStage) {
  return stage.paymentChannel === "TRANSFER" && stage.dueEnabled && ["READY", "REJECTED"].includes(stage.status);
}

function paymentChannelLabel(isSubscriptionQuote: boolean, stage: QuoteStage) {
  if (isSubscriptionQuote) return "Suscripción mensual por Flow";
  return stage.paymentChannel === "FLOW" ? "Pago online con tarjeta" : "Transferencia bancaria";
}

function createEmptyLegalState() {
  return {
    acceptTerms: false,
    acceptPrivacy: false,
  };
}

export function QuotePaymentActions({ quotes, paymentResult, paymentMessage, paymentLabel }: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(paymentMessage || null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [legalState, setLegalState] = useState(createEmptyLegalState);
  const [transferState, setTransferState] = useState<
    Record<string, { transferDate: string; reference: string; note: string; file: File | null }>
  >({});

  const actionableQuotes = useMemo(
    () => quotes.filter((quote) => quotePaymentVisibleInPortal(quote.status, quote.payment)),
    [quotes],
  );

  const modalQuote = useMemo(
    () => (paymentModal ? actionableQuotes.find((quote) => quote.id === paymentModal.quoteId) || null : null),
    [actionableQuotes, paymentModal],
  );

  const modalStage = useMemo(
    () =>
      paymentModal && modalQuote
        ? (modalQuote.payment?.stages || []).find((stage) => stage.key === paymentModal.stageKey) || null
        : null,
    [modalQuote, paymentModal],
  );

  const isModalBusy = Boolean(
    paymentModal &&
      pending &&
      (activeStage === `${paymentModal.quoteId}:${paymentModal.stageKey}` ||
        activeStage === `${paymentModal.quoteId}:SUBSCRIPTION`),
  );

  function closePaymentModal() {
    setPaymentModal(null);
    setModalError(null);
    setLegalState(createEmptyLegalState());
  }

  function openPaymentModal(quoteId: string, stageKey: QuoteStage["key"], mode: "FLOW" | "SUBSCRIPTION") {
    setFeedback(null);
    setModalError(null);
    setLegalState(createEmptyLegalState());
    setPaymentModal({ quoteId, stageKey, mode });
  }

  async function startFlowPayment(quoteId: string, stageKey: string, legalAcceptance: LegalAcceptancePayload) {
    setFeedback(null);
    setModalError(null);
    setActiveStage(`${quoteId}:${stageKey}`);

    const response = await fetch(`/api/portal/payments/quotes/${quoteId}/flow/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(legalAcceptance),
    });
    const payload = (await response.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };

    if (!response.ok || !payload.checkoutUrl) {
      const message = payload.error || "No se pudo iniciar el pago online.";
      setFeedback(message);
      setModalError(message);
      setActiveStage(null);
      return;
    }

    window.location.assign(payload.checkoutUrl);
  }

  async function startSubscriptionPayment(quoteId: string, legalAcceptance: LegalAcceptancePayload) {
    setFeedback(null);
    setModalError(null);
    setActiveStage(`${quoteId}:SUBSCRIPTION`);

    const response = await fetch(`/api/portal/payments/quotes/${quoteId}/subscription/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(legalAcceptance),
    });
    const payload = (await response.json().catch(() => ({}))) as { redirectUrl?: string; error?: string };

    if (!response.ok || !payload.redirectUrl) {
      const message = payload.error || "No se pudo iniciar la suscripción mensual.";
      setFeedback(message);
      setModalError(message);
      setActiveStage(null);
      return;
    }

    window.location.assign(payload.redirectUrl);
  }

  async function submitTransfer(quoteId: string, stage: QuoteStage) {
    const key = `${quoteId}:${stage.key}`;
    const current = transferState[key] || {
      transferDate: "",
      reference: "",
      note: "",
      file: null,
    };

    setFeedback(null);
    setActiveStage(key);

    const body = new FormData();
    body.set("stageKey", stage.key);
    if (current.transferDate) body.set("transferDate", current.transferDate);
    if (current.reference) body.set("reference", current.reference);
    if (current.note) body.set("note", current.note);
    if (current.file) body.set("file", current.file);

    const response = await fetch(`/api/portal/payments/quotes/${quoteId}/transfer`, {
      method: "POST",
      body,
    });
    const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

    if (!response.ok || !payload.ok) {
      setFeedback(payload.error || "No se pudo registrar el comprobante.");
      setActiveStage(null);
      return;
    }

    setFeedback("Comprobante enviado correctamente. Quedó pendiente de revisión.");
    window.location.reload();
  }

  function confirmPortalPayment() {
    if (!paymentModal || !modalQuote || !modalStage) {
      setModalError("No se pudo cargar la información del cobro. Cierra esta ventana e inténtalo nuevamente.");
      return;
    }

    if (!legalState.acceptTerms || !legalState.acceptPrivacy) {
      setModalError("Debes aceptar los términos y condiciones y la política de privacidad para continuar.");
      return;
    }

    const legalAcceptance: LegalAcceptancePayload = {
      acceptTerms: true,
      acceptPrivacy: true,
    };

    startTransition(() =>
      paymentModal.mode === "SUBSCRIPTION"
        ? void startSubscriptionPayment(modalQuote.id, legalAcceptance)
        : void startFlowPayment(modalQuote.id, modalStage.key, legalAcceptance),
    );
  }

  return (
    <div className="space-y-4">
      {paymentResult ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            paymentResult === "paid"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : paymentResult === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {paymentResult === "paid"
            ? `Pago validado correctamente${paymentLabel ? ` · ${paymentLabel}` : ""}.`
            : paymentMessage || "Revisa el estado del pago en esta vista."}
        </div>
      ) : null}

      {feedback ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          {feedback}
        </div>
      ) : null}

      {actionableQuotes.map((quote) => {
        const settledByAdmin = quotePaymentIsMarkedPaidInAdmin(quote.status);
        const isSubscriptionQuote = quote.payment?.billingType === "SUBSCRIPTION";
        const subscriptionActive = quote.payment?.subscription?.status === "ACTIVE";
        const quoteBadge = settledByAdmin
          ? isSubscriptionQuote && subscriptionActive
            ? "Suscripción activa"
            : "Pagada"
          : quote.payment?.alertStatus === "TRANSFER_REVIEW"
            ? "Pago en revisión"
            : isSubscriptionQuote
              ? "Suscripción pendiente"
              : "Pago pendiente";

        return (
          <article key={quote.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Cobro asociado</p>
                <h3 className="text-base font-extrabold text-slate-900">{quote.displayNumber}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Total cotización {currency(quote.totalAmount)} · pendiente {currency(quote.payment?.totalPending || 0)}
                </p>
              </div>
              <div className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                {quoteBadge}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {(quote.payment?.stages || []).map((stage) => {
                const key = `${quote.id}:${stage.key}`;
                const transferForm = transferState[key] || {
                  transferDate: "",
                  reference: "",
                  note: "",
                  file: null,
                };
                const isBusy = pending && (activeStage === key || activeStage === `${quote.id}:SUBSCRIPTION`);

                return (
                  <div key={stage.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{stage.label}</p>
                        <p className="text-xs text-slate-500">{stage.dueLabel || "Etapa de cobro"}</p>
                      </div>
                      <div className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusStyles(stage.status)}`}>
                        {stageStatusLabel(stage.status)}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                      <span className="font-semibold text-slate-900">{currency(stage.amount)}</span>
                      <span>{paymentChannelLabel(isSubscriptionQuote, stage)}</span>
                      {stage.paidAt ? <span>Pagado</span> : null}
                    </div>

                    {isSubscriptionQuote ? (
                      <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                        {subscriptionActive
                          ? `Suscripción mensual activa por ${currency(quote.payment?.subscription?.amount || stage.amount)}${quote.payment?.subscription?.nextInvoiceDate ? ` · próximo cobro ${quote.payment.subscription.nextInvoiceDate}` : ""}.`
                          : `Esta cotización se activará como suscripción mensual por ${currency(quote.payment?.subscription?.amount || stage.amount)}.`}
                      </div>
                    ) : null}

                    <div className="mt-3">
                      <a
                        href={quote.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Download className="h-4 w-4" />
                        Descargar cotización PDF
                      </a>
                    </div>

                    {stage.status === "PAID" ? (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Pago validado correctamente.
                      </div>
                    ) : null}

                    {stage.status === "PENDING" && !stage.dueEnabled ? (
                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                        <AlertCircle className="h-4 w-4" />
                        Esta etapa aún no está habilitada por administración.
                      </div>
                    ) : null}

                    {canShowFlowPayment(stage) || canShowTransferPayment(stage) ? (
                      <div className="mt-4 space-y-3">
                        {canShowFlowPayment(stage) ? (
                          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                            <p className="text-sm font-semibold text-blue-900">
                              {isSubscriptionQuote
                                ? "Revisa el resumen del cobro mensual, valida los términos legales y luego activa tu suscripción en Flow."
                                : "Revisa la información del cobro, valida los términos legales y luego continúa a la pasarela de pago."}
                            </p>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => openPaymentModal(quote.id, stage.key, isSubscriptionQuote ? "SUBSCRIPTION" : "FLOW")}
                              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                            >
                              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                              {isSubscriptionQuote ? "Revisar y activar suscripción" : "Revisar pago y continuar"}
                            </button>
                          </div>
                        ) : (
                          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-sm font-bold text-slate-900">Datos para transferencia</p>
                              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <div className="grid grid-cols-[1.3fr_1fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                                  <span className="font-semibold text-slate-700">Banco</span>
                                  <span className="text-right font-semibold text-slate-900">{ZYTERON_COMPANY.transferBank}</span>
                                </div>
                                <div className="grid grid-cols-[1.3fr_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                                  <span className="font-semibold text-slate-700">RUT</span>
                                  <span className="text-right font-semibold text-slate-900">{ZYTERON_COMPANY.rut}</span>
                                </div>
                                <div className="grid grid-cols-[1.3fr_1fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                                  <span className="font-semibold text-slate-700">Razón social</span>
                                  <span className="text-right font-semibold text-slate-900">Zyteron Spa</span>
                                </div>
                                <div className="grid grid-cols-[1.3fr_1fr] border-b border-slate-200 px-4 py-3 text-sm">
                                  <span className="font-semibold text-slate-700">Correo electrónico</span>
                                  <span className="text-right font-semibold text-blue-700">{ZYTERON_COMPANY.transferAccountEmail}</span>
                                </div>
                                <div className="grid grid-cols-[1.3fr_1fr] border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                                  <span className="font-semibold text-slate-700">Tipo de cuenta</span>
                                  <span className="text-right font-semibold text-slate-900">{ZYTERON_COMPANY.transferAccountType}</span>
                                </div>
                                <div className="grid grid-cols-[1.3fr_1fr] px-4 py-3 text-sm">
                                  <span className="font-semibold text-slate-700">Número de cuenta</span>
                                  <span className="text-right font-semibold text-slate-900">{ZYTERON_COMPANY.transferAccountNumber}</span>
                                </div>
                              </div>
                              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                                Monto exacto a transferir: <span className="font-bold">{currency(stage.amount)}</span>
                              </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="space-y-1 text-xs font-semibold text-slate-600">
                                Fecha de transferencia
                                <input
                                  type="date"
                                  value={transferForm.transferDate}
                                  onChange={(event) =>
                                    setTransferState((prev) => ({
                                      ...prev,
                                      [key]: { ...transferForm, transferDate: event.target.value },
                                    }))
                                  }
                                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                                />
                              </label>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="space-y-1 text-xs font-semibold text-slate-600">
                                Referencia
                                <input
                                  value={transferForm.reference}
                                  onChange={(event) =>
                                    setTransferState((prev) => ({
                                      ...prev,
                                      [key]: { ...transferForm, reference: event.target.value },
                                    }))
                                  }
                                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                                />
                              </label>
                              <label className="space-y-1 text-xs font-semibold text-slate-600">
                                Comprobante
                                <input
                                  type="file"
                                  onChange={(event) =>
                                    setTransferState((prev) => ({
                                      ...prev,
                                      [key]: { ...transferForm, file: event.target.files?.[0] || null },
                                    }))
                                  }
                                  className="block w-full text-sm text-slate-600"
                                />
                              </label>
                            </div>
                            <label className="space-y-1 text-xs font-semibold text-slate-600">
                              Nota
                              <textarea
                                rows={3}
                                value={transferForm.note}
                                onChange={(event) =>
                                  setTransferState((prev) => ({
                                    ...prev,
                                    [key]: { ...transferForm, note: event.target.value },
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              />
                            </label>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => startTransition(() => void submitTransfer(quote.id, stage))}
                              className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                            >
                              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                              Enviar comprobante
                            </button>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                              <div className="flex items-center gap-2">
                                <Landmark className="h-4 w-4 text-slate-400" />
                                El comprobante se envía al equipo comercial para validación contra el monto oficial de la cotización.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {stage.status === "PENDING_TRANSFER_REVIEW" && stage.transferProofs?.length ? (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        Último comprobante enviado: {stage.transferProofs[stage.transferProofs.length - 1]?.fileName || "sin archivo"}.
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}

      <Dialog open={Boolean(paymentModal)} onOpenChange={(open) => (!open ? closePaymentModal() : null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto border-0 bg-white p-0 sm:max-w-2xl">
          {modalQuote && modalStage ? (
            <div className="overflow-hidden rounded-[28px]">
              <div className="relative border-b border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_55%,#f8fafc_100%)] px-6 py-6">
                <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-200/30 blur-3xl" />
                <DialogHeader className="relative space-y-3">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Confirmación segura
                  </div>
                  <DialogTitle className="text-2xl font-extrabold text-slate-950">
                    {paymentModal?.mode === "SUBSCRIPTION" ? "Activa tu suscripción mensual" : "Confirma tu pago online"}
                  </DialogTitle>
                  <DialogDescription className="max-w-2xl text-sm leading-relaxed text-slate-600">
                    Revisa la información del cobro antes de salir a Flow. Esta validación deja aceptación obligatoria de términos y política de privacidad.
                  </DialogDescription>
                </DialogHeader>

                <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Cotización</p>
                    <p className="mt-2 text-lg font-extrabold text-slate-900">{modalQuote.displayNumber}</p>
                    <p className="mt-1 text-xs text-slate-500">Documento comercial asociado al cobro.</p>
                  </div>
                  <div className="rounded-2xl border border-blue-200 bg-blue-600 p-4 text-white shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-100">Monto a pagar</p>
                    <p className="mt-2 text-2xl font-black">{currency(modalStage.amount)}</p>
                    <p className="mt-1 text-xs text-blue-100">{modalStage.label}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Modalidad</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{paymentChannelLabel(modalQuote.payment?.billingType === "SUBSCRIPTION", modalStage)}</p>
                    <p className="mt-1 text-xs text-slate-500">{modalStage.dueLabel || "Cobro habilitado para esta etapa."}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 p-6">
                {modalError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {modalError}
                  </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-900">
                      <CreditCard className="h-5 w-5 text-blue-700" />
                      <p className="text-sm font-bold">Resumen del cobro</p>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cobro actual</p>
                        <p className="mt-1 text-base font-extrabold text-slate-900">{modalStage.label}</p>
                        <p className="mt-1 text-sm text-slate-600">{currency(modalStage.amount)}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pendiente total</p>
                        <p className="mt-1 text-base font-extrabold text-slate-900">{currency(modalQuote.payment?.totalPending || 0)}</p>
                        <p className="mt-1 text-sm text-slate-600">Total cotización {currency(modalQuote.totalAmount)}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Qué pasará ahora</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-700">
                          <p>1. Confirmarás este cobro y saldrás a la pasarela segura de Flow.</p>
                          <p>2. Completarás el pago con los medios habilitados por el proveedor.</p>
                          <p>3. Volverás al portal con el estado actualizado de la cotización.</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                        La etapa quedará vinculada a tu cuenta y al documento comercial descargable desde este mismo portal.
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center gap-2 text-slate-900">
                      <FileText className="h-5 w-5 text-slate-700" />
                      <p className="text-sm font-bold">Respaldo y seguridad</p>
                    </div>
                    <a
                      href={modalQuote.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      <Download className="h-4 w-4" />
                      Descargar cotización PDF
                    </a>
                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                      <div className="flex items-center gap-2 font-semibold">
                        <ShieldCheck className="h-4 w-4" />
                        Validación previa obligatoria
                      </div>
                      <p className="mt-2 text-blue-800">
                        Antes de continuar debes aceptar los términos legales y la política de privacidad del servicio.
                      </p>
                    </div>
                  </section>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-2 shadow-sm">
                      <ShieldCheck className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Aceptación legal previa al pago</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Esta confirmación es obligatoria y queda registrada antes de iniciar el checkout.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <Label htmlFor="quote-accept-terms" className="items-start gap-3 leading-relaxed text-slate-700">
                        <Checkbox
                          id="quote-accept-terms"
                          checked={legalState.acceptTerms}
                          onCheckedChange={(checked) =>
                            setLegalState((current) => ({
                              ...current,
                              acceptTerms: checked === true,
                            }))
                          }
                          className="mt-0.5"
                        />
                        <span>
                          Acepto los{" "}
                          <a href="/terminos" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline underline-offset-2">
                            términos y condiciones
                          </a>{" "}
                          aplicables a esta contratación y a la ejecución del servicio cotizado.
                        </span>
                      </Label>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <Label htmlFor="quote-accept-privacy" className="items-start gap-3 leading-relaxed text-slate-700">
                        <Checkbox
                          id="quote-accept-privacy"
                          checked={legalState.acceptPrivacy}
                          onCheckedChange={(checked) =>
                            setLegalState((current) => ({
                              ...current,
                              acceptPrivacy: checked === true,
                            }))
                          }
                          className="mt-0.5"
                        />
                        <span>
                          Acepto la{" "}
                          <a href="/privacidad" target="_blank" rel="noreferrer" className="font-semibold text-blue-700 underline underline-offset-2">
                            política de privacidad
                          </a>{" "}
                          y el tratamiento de datos necesario para procesar el pago y gestionar esta cotización.
                        </span>
                      </Label>
                    </div>
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Al continuar saldrás del portal momentáneamente para completar el proceso en Flow.
                </p>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isModalBusy}
                    onClick={confirmPortalPayment}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                  >
                    {isModalBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {paymentModal?.mode === "SUBSCRIPTION" ? "Aceptar y activar suscripción" : "Aceptar y continuar al pago"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
