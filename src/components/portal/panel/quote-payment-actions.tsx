"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  Eye,
  FileText,
  Landmark,
  Loader2,
  ScrollText,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ZYTERON_COMPANY } from "@/lib/company";
import {
  privacyIntro,
  privacyLastUpdated,
  privacySections,
  termsCompanyInfo,
  termsExtraNotes,
  termsIntro,
  termsLastUpdated,
  termsSections,
} from "@/content/legal-documents";
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

type LegalDocument = "terms" | "privacy" | null;

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

function paymentContextLabel(stage: QuoteStage, isSubscriptionQuote: boolean) {
  if (isSubscriptionQuote) return "Activación del cobro mensual recurrente";
  if (stage.key === "INITIAL") return "Abono inicial del proyecto";
  if (stage.key === "FINAL") return "Saldo final del proyecto";
  if (stage.key === "DELIVERY") return "Pago contraentrega";
  return "Pago completo de la cotización";
}

export function QuotePaymentActions({ quotes, paymentResult, paymentMessage, paymentLabel }: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(paymentMessage || null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>(null);
  const [legalDocument, setLegalDocument] = useState<LegalDocument>(null);
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
    setLegalDocument(null);
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
        <DialogContent className="max-h-[92vh] overflow-y-auto border-0 bg-white p-0 md:max-h-none md:max-w-[1120px] md:overflow-visible">
          {modalQuote && modalStage ? (
            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
              <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_48%,#eef4ff_100%)] px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <DialogHeader className="max-w-3xl space-y-2">
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-blue-700 shadow-sm">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Pago protegido
                    </div>
                    <DialogTitle className="text-3xl font-extrabold tracking-tight text-slate-950">
                      {paymentModal?.mode === "SUBSCRIPTION" ? "Confirmar suscripción mensual" : "Confirmar pago de cotización"}
                    </DialogTitle>
                    <DialogDescription className="text-base text-slate-600">
                      Estás pagando <span className="font-semibold text-slate-900">{modalStage.label}</span> de la cotización{" "}
                      <span className="font-semibold text-slate-900">{modalQuote.displayNumber}</span>.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="min-w-[220px] rounded-3xl bg-blue-600 px-5 py-4 text-white shadow-lg shadow-blue-600/20">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-blue-100">Cargo de hoy</p>
                    <p className="mt-2 text-4xl font-black leading-none">{currency(modalStage.amount)}</p>
                    <p className="mt-2 text-sm text-blue-100">{paymentContextLabel(modalStage, modalQuote.payment?.billingType === "SUBSCRIPTION")}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Cotización</p>
                    <p className="mt-2 text-xl font-extrabold text-slate-900">{modalQuote.displayNumber}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Qué pagas</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{modalStage.label}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Método</p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {paymentChannelLabel(modalQuote.payment?.billingType === "SUBSCRIPTION", modalStage)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Pendiente luego</p>
                    <p className="mt-2 text-xl font-extrabold text-slate-900">
                      {currency(Math.max(0, (modalQuote.payment?.totalPending || 0) - modalStage.amount))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 px-6 py-5 lg:grid-cols-[1.25fr_0.95fr]">
                <section className="space-y-4">
                  {modalError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                      {modalError}
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Monto exacto</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{currency(modalStage.amount)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Total cotización</p>
                      <p className="mt-2 text-2xl font-black text-slate-950">{currency(modalQuote.totalAmount)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Estado</p>
                      <p className="mt-2 text-lg font-bold text-slate-950">{stageStatusLabel(modalStage.status)}</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">Documentación y validación</p>
                        <p className="mt-1 text-sm text-slate-600">Abre el respaldo comercial y revisa las políticas sin salir del portal.</p>
                      </div>
                      <a
                        href={modalQuote.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        <Download className="h-4 w-4" />
                        Ver cotización PDF
                      </a>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setLegalDocument("terms")}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-white p-2 shadow-sm">
                            <ScrollText className="h-4 w-4 text-blue-700" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Ver términos</p>
                            <p className="text-xs text-slate-500">Condiciones del servicio y del cobro</p>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-slate-400" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setLegalDocument("privacy")}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-white p-2 shadow-sm">
                            <FileText className="h-4 w-4 text-blue-700" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Ver privacidad</p>
                            <p className="text-xs text-slate-500">Tratamiento de datos y pago</p>
                          </div>
                        </div>
                        <Eye className="h-4 w-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_100%)] p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-blue-600 p-2.5 text-white shadow-lg shadow-blue-600/20">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-extrabold text-slate-950">Aceptación legal</p>
                      <p className="text-sm text-slate-600">Marca ambas confirmaciones para continuar al pago.</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <button
                      type="button"
                      onClick={() =>
                        setLegalState((current) => ({
                          ...current,
                          acceptTerms: !current.acceptTerms,
                        }))
                      }
                      className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                        legalState.acceptTerms
                          ? "border-blue-600 bg-blue-50 shadow-lg shadow-blue-600/10"
                          : "border-slate-300 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 ${
                            legalState.acceptTerms
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white text-transparent"
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-950">Acepto los términos y condiciones</p>
                          <p className="mt-1 text-sm text-slate-600">Confirmo las condiciones comerciales, de alcance, pago, garantía y entrega asociadas a esta cotización.</p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setLegalState((current) => ({
                          ...current,
                          acceptPrivacy: !current.acceptPrivacy,
                        }))
                      }
                      className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                        legalState.acceptPrivacy
                          ? "border-blue-600 bg-blue-50 shadow-lg shadow-blue-600/10"
                          : "border-slate-300 bg-white hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border-2 ${
                            legalState.acceptPrivacy
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300 bg-white text-transparent"
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-slate-950">Acepto la política de privacidad</p>
                          <p className="mt-1 text-sm text-slate-600">Autorizo el tratamiento de datos necesario para validar el pago, documentar el cobro y gestionar el servicio.</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    El registro de aceptación queda guardado antes de salir a Flow.
                  </div>
                </section>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-slate-500">Al continuar se abrirá la pasarela segura de Flow para completar este cobro.</p>
                <div className="flex flex-col-reverse gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={closePaymentModal}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
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
                    {paymentModal?.mode === "SUBSCRIPTION" ? "Confirmar y activar suscripción" : "Confirmar y continuar a Flow"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(legalDocument)} onOpenChange={(open) => (!open ? setLegalDocument(null) : null)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-0 bg-white p-0 md:max-w-4xl">
          {legalDocument ? (
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_55%,#eef4ff_100%)] px-6 py-5">
                <DialogHeader className="space-y-2">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-blue-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Información legal interna
                  </div>
                  <DialogTitle className="text-2xl font-extrabold text-slate-950">
                    {legalDocument === "terms" ? "Términos y condiciones del servicio" : "Política de privacidad"}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-600">
                    {legalDocument === "terms"
                      ? "Documento completo aplicable a la contratación y al cobro asociado a esta cotización."
                      : "Documento completo sobre el tratamiento de datos asociado al pago y a la gestión del servicio."}
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-6">
                {legalDocument === "terms" ? (
                  <article className="mx-auto max-w-3xl space-y-8">
                    <div className="space-y-3 border-b border-slate-200 pb-6">
                      <p className="text-sm leading-7 text-slate-700">
                        {termsIntro.split("ZYTERON SpA").map((part, index, array) => (
                          <span key={index}>
                            {part}
                            {index < array.length - 1 ? <strong>ZYTERON SpA</strong> : null}
                          </span>
                        ))}
                      </p>
                      <div className="grid gap-x-8 gap-y-3 pt-2 sm:grid-cols-2">
                        {termsCompanyInfo.map((item) => (
                          <div key={item.label}>
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {termsSections.map((section) => (
                      <section key={section.title} className="border-b border-slate-200 pb-6 last:border-b-0 last:pb-0">
                        <h3 className="text-xl font-extrabold text-slate-950">{section.title}</h3>
                        <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                          {section.points.map((point, index) => (
                            <p key={index}>
                              <span className="mr-2 font-bold text-blue-700">•</span>
                              {point}
                            </p>
                          ))}
                        </div>
                      </section>
                    ))}

                    <section className="border-t border-slate-200 pt-6">
                      <h3 className="text-lg font-extrabold text-slate-950">Notas operativas complementarias</h3>
                      <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                        {termsExtraNotes.map((note) => (
                          <p key={note}>
                            <span className="mr-2 font-bold text-blue-700">•</span>
                            {note}
                          </p>
                        ))}
                      </div>
                      <p className="mt-6 text-xs text-slate-500">Última actualización: {termsLastUpdated}.</p>
                    </section>
                  </article>
                ) : (
                  <article className="mx-auto max-w-3xl space-y-8">
                    <div className="space-y-3 border-b border-slate-200 pb-6">
                      <p className="text-sm leading-7 text-slate-700">{privacyIntro}</p>
                    </div>

                    {privacySections.map((section) => (
                      <section key={section.title} className="border-b border-slate-200 pb-6 last:border-b-0 last:pb-0">
                        <h3 className="text-xl font-extrabold text-slate-950">{section.title}</h3>
                        <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
                          {section.points.map((point, index) => (
                            <p key={index}>
                              <span className="mr-2 font-bold text-blue-700">•</span>
                              {point}
                            </p>
                          ))}
                        </div>
                      </section>
                    ))}

                    <p className="text-xs text-slate-500">Última actualización: {privacyLastUpdated}.</p>
                  </article>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
