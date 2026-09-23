"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDownRight,
  BadgeDollarSign,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  History,
  PlusCircle,
  RotateCcw,
  WalletCards,
} from "lucide-react";

type Receivable = {
  id: string;
  sourceKey: string;
  description: string;
  kind: string;
  quoteId: string | null;
  taxDocumentId: string | null;
  totalAmount: number;
  appliedAmount: number;
  balanceAmount: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
  issuedAt: string;
  dueAt: string | null;
};

type Payment = {
  id: string;
  amount: number;
  allocatedAmount: number;
  creditAmount: number;
  method: string;
  source: string;
  status: string;
  reference: string | null;
  receivedAt: string;
  voidedAt: string | null;
  voidReason: string | null;
};

export type SerializableClientFinanceSummary = {
  available: boolean;
  unavailableReason?: string;
  totals: {
    receivableAmount: number;
    receivedAmount: number;
    appliedAmount: number;
    outstandingAmount: number;
    overdueAmount: number;
    creditAmount: number;
  };
  receivables: Receivable[];
  payments: Payment[];
};

const METHOD_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Transferencia bancaria",
  CARD: "Tarjeta",
  CASH: "Efectivo",
  CHECK: "Cheque",
  OTHER: "Otro",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "Confirmado",
  PENDING: "Pendiente",
  VOIDED: "Anulado",
  FAILED: "Fallido",
};

const RECEIVABLE_STATUS_LABELS: Record<Receivable["status"], string> = {
  PENDING: "Pendiente",
  PARTIAL: "Abono parcial",
  PAID: "Pagado",
  OVERDUE: "Vencido",
  CANCELLED: "Cancelado",
};

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function dateLabel(value?: string | null, includeTime = false) {
  if (!value) return "Sin fecha";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(parsed);
}

function statusTone(status: string) {
  if (status === "PAID" || status === "CONFIRMED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (status === "OVERDUE" || status === "FAILED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  if (status === "PARTIAL" || status === "PENDING") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-100 text-slate-600";
}

function toSerializableSummary(value: unknown): SerializableClientFinanceSummary | null {
  if (!value || typeof value !== "object") return null;
  return value as SerializableClientFinanceSummary;
}

export function ClientFinancePanel({
  clientId,
  initialSummary,
}: {
  clientId: string;
  initialSummary: SerializableClientFinanceSummary;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [summary, setSummary] = useState(initialSummary);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    null,
  );
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [form, setForm] = useState({
    amount: "",
    method: "BANK_TRANSFER",
    receivableId: "",
    receivedAt: new Date().toISOString().slice(0, 10),
    reference: "",
    notes: "",
  });

  const openReceivables = useMemo(
    () =>
      summary.receivables.filter((item) => item.balanceAmount > 0 && item.status !== "CANCELLED"),
    [summary.receivables],
  );

  async function readResponse(response: Response) {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "No se pudo completar la operación.");
    }
    const nextSummary = toSerializableSummary(payload?.summary);
    if (nextSummary) setSummary(nextSummary);
    return payload;
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/admin/clientes/${clientId}/pagos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Number(form.amount),
            method: form.method,
            receivableId: form.receivableId || undefined,
            receivedAt: form.receivedAt || undefined,
            reference: form.reference || undefined,
            notes: form.notes || undefined,
          }),
        });
        const payload = await readResponse(response);
        setFeedback({
          tone: "success",
          message: payload.message || "Pago registrado correctamente.",
        });
        setForm((current) => ({
          ...current,
          amount: "",
          reference: "",
          notes: "",
        }));
        router.refresh();
      } catch (error) {
        setFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "No se pudo registrar el pago.",
        });
      }
    });
  }

  function voidPayment(paymentId: string) {
    setFeedback(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/admin/clientes/${clientId}/pagos/${paymentId}/anular`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: voidReason }),
        });
        const payload = await readResponse(response);
        setFeedback({ tone: "success", message: payload.message || "Pago anulado correctamente." });
        setVoidingId(null);
        setVoidReason("");
        router.refresh();
      } catch (error) {
        setFeedback({
          tone: "error",
          message: error instanceof Error ? error.message : "No se pudo anular el pago.",
        });
      }
    });
  }

  if (!summary.available) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <h2 className="font-extrabold text-amber-950">
              Cartola financiera pendiente de activación
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">{summary.unavailableReason}</p>
          </div>
        </div>
      </section>
    );
  }

  const financialCards = [
    {
      label: "Por cobrar",
      value: summary.totals.receivableAmount,
      helper: `${openReceivables.length} cuentas activas`,
      icon: CircleDollarSign,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Recibido",
      value: summary.totals.receivedAmount,
      helper: "Pagos confirmados",
      icon: Banknote,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Saldo pendiente",
      value: summary.totals.outstandingAmount,
      helper:
        summary.totals.overdueAmount > 0
          ? `${currency(summary.totals.overdueAmount)} vencido`
          : "Sin mora vencida",
      icon: Clock3,
      tone:
        summary.totals.overdueAmount > 0
          ? "bg-rose-50 text-rose-700"
          : "bg-amber-50 text-amber-700",
    },
    {
      label: "Crédito disponible",
      value: summary.totals.creditAmount,
      helper: "Anticipos aún no asignados",
      icon: WalletCards,
      tone: "bg-violet-50 text-violet-700",
    },
  ];

  return (
    <section className="space-y-5" id="finanzas">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-blue-600 uppercase">
            Tesorería del cliente
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-950">
            Cobros, abonos y conciliación
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Cada pago conserva trazabilidad y la diferencia pendiente se recalcula automáticamente.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Cartola normalizada
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {financialCards.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.tone}`}>
              <item.icon className="h-4.5 w-4.5" />
            </div>
            <p className="mt-3 text-xl font-extrabold text-slate-950">{currency(item.value)}</p>
            <p className="text-xs font-bold text-slate-700">{item.label}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{item.helper}</p>
          </article>
        ))}
      </div>

      {feedback ? (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="grid gap-5 2xl:grid-cols-[0.85fr_1.15fr]">
        <form
          onSubmit={submitPayment}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4 text-blue-700" />
            <h3 className="text-sm font-extrabold text-slate-900">Registrar pago manual</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Admite cualquier monto. Si es menor, queda saldo pendiente; si es mayor o no se asigna,
            el remanente queda como crédito.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Monto recibido *</span>
              <input
                name="amount"
                type="number"
                min="1"
                step="1"
                required
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Ej. 150000"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Medio de pago *</span>
              <select
                name="method"
                value={form.method}
                onChange={(event) => setForm({ ...form, method: event.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                {Object.entries(METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-3 block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">Aplicar a</span>
            <select
              name="receivableId"
              value={form.receivableId}
              onChange={(event) => setForm({ ...form, receivableId: event.target.value })}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Crédito / anticipo sin asignar</option>
              {openReceivables.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.description} · pendiente {currency(item.balanceAmount)}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Fecha de recepción</span>
              <input
                type="date"
                value={form.receivedAt}
                onChange={(event) => setForm({ ...form, receivedAt: event.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700">Referencia</span>
              <input
                value={form.reference}
                onChange={(event) => setForm({ ...form, reference: event.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="N.º operación / comprobante"
              />
            </label>
          </div>

          <label className="mt-3 block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">Nota interna</span>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Contexto del pago o acuerdo con el cliente"
            />
          </label>

          <button
            type="submit"
            disabled={pending}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BadgeDollarSign className="h-4 w-4" />{" "}
            {pending ? "Procesando..." : "Registrar y conciliar"}
          </button>
        </form>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Cuentas por cobrar</h3>
              <p className="mt-1 text-xs text-slate-500">Saldo por documento, cotización o hito.</p>
            </div>
            <CreditCard className="h-5 w-5 text-slate-300" />
          </div>
          <div className="mt-4 space-y-2">
            {summary.receivables.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{item.description}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Emitido {dateLabel(item.issuedAt)}
                      {item.dueAt ? ` · vence ${dateLabel(item.dueAt)}` : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone(item.status)}`}
                  >
                    {RECEIVABLE_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400">Total</p>
                    <p className="font-bold text-slate-800">{currency(item.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Abonado</p>
                    <p className="font-bold text-emerald-700">{currency(item.appliedAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Pendiente</p>
                    <p className="font-bold text-amber-700">{currency(item.balanceAmount)}</p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{
                      width: `${item.totalAmount > 0 ? Math.min(100, Math.round((item.appliedAmount / item.totalAmount) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ))}
            {summary.receivables.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                Sin cuentas por cobrar registradas.
              </div>
            ) : null}
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-extrabold text-slate-900">Historial inmutable de pagos</h3>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Medio / referencia</th>
                <th className="px-3 py-2">Monto</th>
                <th className="px-3 py-2">Aplicado</th>
                <th className="px-3 py-2">Crédito</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.payments.map((payment) => (
                <tr key={payment.id} className="align-top">
                  <td className="px-3 py-3 text-xs whitespace-nowrap text-slate-500">
                    {dateLabel(payment.receivedAt, true)}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-800">
                      {METHOD_LABELS[payment.method] || payment.method}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {payment.reference || payment.source}
                    </p>
                    {voidingId === payment.id ? (
                      <div className="mt-2 flex min-w-64 gap-2">
                        <input
                          value={voidReason}
                          onChange={(event) => setVoidReason(event.target.value)}
                          className="h-9 min-w-0 flex-1 rounded-lg border border-rose-200 px-2 text-xs outline-none focus:ring-2 focus:ring-rose-100"
                          placeholder="Motivo (mín. 5 caracteres)"
                        />
                        <button
                          type="button"
                          disabled={pending || voidReason.trim().length < 5}
                          onClick={() => voidPayment(payment.id)}
                          className="rounded-lg bg-rose-600 px-3 text-xs font-bold text-white disabled:opacity-40"
                        >
                          Confirmar
                        </button>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-extrabold whitespace-nowrap text-slate-900">
                    {currency(payment.amount)}
                  </td>
                  <td className="px-3 py-3 font-semibold whitespace-nowrap text-emerald-700">
                    {currency(payment.allocatedAmount)}
                  </td>
                  <td className="px-3 py-3 font-semibold whitespace-nowrap text-violet-700">
                    {currency(payment.creditAmount)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusTone(payment.status)}`}
                    >
                      {PAYMENT_STATUS_LABELS[payment.status] || payment.status}
                    </span>
                    {payment.voidReason ? (
                      <p className="mt-1 max-w-44 text-[10px] text-slate-400">
                        {payment.voidReason}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {payment.status === "CONFIRMED" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setVoidingId(voidingId === payment.id ? null : payment.id);
                          setVoidReason("");
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Anular
                      </button>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {summary.payments.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
              <ArrowDownRight className="h-4 w-4" /> Aún no hay pagos registrados.
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
