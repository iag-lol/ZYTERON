"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, CreditCard, Download, Landmark, Loader2, UploadCloud } from "lucide-react";
import { ZYTERON_COMPANY } from "@/lib/company";
import { quotePaymentIsMarkedPaidInAdmin, quotePaymentRequiresPortalAction } from "@/lib/payments/quote-payments";

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
    totalPaid?: number;
    totalPending?: number;
    alertStatus?: "PENDING" | "PAID" | "TRANSFER_REVIEW";
    stages?: QuoteStage[];
  };
};

type Props = {
  quotes: QuoteItem[];
  paymentResult?: "paid" | "pending" | "error" | null;
  paymentMessage?: string | null;
  paymentLabel?: string | null;
};

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

export function QuotePaymentActions({ quotes, paymentResult, paymentMessage, paymentLabel }: Props) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(paymentMessage || null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [transferState, setTransferState] = useState<Record<string, { transferDate: string; reference: string; note: string; file: File | null }>>({});

  const actionableQuotes = useMemo(
    () => quotes.filter((quote) => quotePaymentRequiresPortalAction(quote.status, quote.payment)),
    [quotes],
  );

  async function startFlowPayment(quoteId: string, stageKey: string) {
    setFeedback(null);
    setActiveStage(`${quoteId}:${stageKey}`);

    const response = await fetch(`/api/portal/payments/quotes/${quoteId}/flow/create`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as { checkoutUrl?: string; error?: string };

    if (!response.ok || !payload.checkoutUrl) {
      setFeedback(payload.error || "No se pudo iniciar el pago online.");
      setActiveStage(null);
      return;
    }

    window.location.assign(payload.checkoutUrl);
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
        const quoteBadge = settledByAdmin
          ? "Pagada"
          : quote.payment?.alertStatus === "TRANSFER_REVIEW"
            ? "Pago en revisión"
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
              const isBusy = pending && activeStage === key;

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
                    <span>{stage.paymentChannel === "FLOW" ? "Pago online con tarjeta" : "Transferencia bancaria"}</span>
                    {stage.paidAt ? <span>Pagado</span> : null}
                  </div>

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

                  {(canShowFlowPayment(stage) || canShowTransferPayment(stage)) ? (
                    <div className="mt-4 space-y-3">
                      {canShowFlowPayment(stage) ? (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                          <p className="text-sm font-semibold text-blue-900">
                            Realiza el pago online con las tarjetas activas disponibles en la pasarela.
                          </p>
                          {stage.status === "PROCESSING" ? (
                            <p className="mt-2 text-xs text-blue-700">
                              Tu intento anterior sigue sin confirmaci&oacute;n. Puedes volver a abrir el pago mientras Flow no lo apruebe.
                            </p>
                          ) : null}
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => startTransition(() => void startFlowPayment(quote.id, stage.key))}
                            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60"
                          >
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                            Pagar cotizaci&oacute;n
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
    </div>
  );
}
