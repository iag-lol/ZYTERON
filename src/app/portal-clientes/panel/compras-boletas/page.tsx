import Link from "next/link";
import {
  CircleDollarSign,
  ExternalLink,
  ReceiptText,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import { getClientFinanceSummary } from "@/lib/admin/client-finance";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";
import { currencyCLP } from "@/lib/portal/data";

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return value.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PortalComprasBoletasPage() {
  const session = await requirePortalSession();
  const [sales, documents, finance] = await Promise.all([
    prisma.sale.findMany({
      where: { clientId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        total: true,
        description: true,
        paymentMethod: true,
        createdAt: true,
      },
    }),
    prisma.taxDocument.findMany({
      where: { clientId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        type: true,
        documentNumber: true,
        issueDate: true,
        paymentStatus: true,
        status: true,
        totalAmount: true,
        pdfUrl: true,
      },
    }),
    getClientFinanceSummary(session.user.id),
  ]);

  const total = sales.reduce((acc, sale) => acc + (sale.total || 0), 0);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">Compras, boletas e historial</h2>
        <p className="mt-1 text-sm text-slate-600">
          Historial de compras de servicios y sus comprobantes asociados.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          <ShoppingCart className="h-3.5 w-3.5" />
          Servicios contratados: {currencyCLP(total)}
        </div>
      </div>

      {finance.available ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
              Total documentado
            </p>
            <p className="mt-2 text-xl font-extrabold text-slate-900">
              {currencyCLP(finance.totals.receivableAmount)}
            </p>
          </article>
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-[11px] font-bold tracking-widest text-emerald-700 uppercase">
              Abonos aplicados
            </p>
            <p className="mt-2 text-xl font-extrabold text-emerald-900">
              {currencyCLP(finance.totals.appliedAmount)}
            </p>
          </article>
          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-[11px] font-bold tracking-widest text-amber-700 uppercase">
              Saldo pendiente
            </p>
            <p className="mt-2 text-xl font-extrabold text-amber-900">
              {currencyCLP(finance.totals.outstandingAmount)}
            </p>
          </article>
          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="text-[11px] font-bold tracking-widest text-blue-700 uppercase">
              Crédito disponible
            </p>
            <p className="mt-2 text-xl font-extrabold text-blue-900">
              {currencyCLP(finance.totals.creditAmount)}
            </p>
          </article>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 shadow-sm">
          <p className="font-bold">Cartola financiera en habilitación</p>
          <p className="mt-1">{finance.unavailableReason}</p>
        </div>
      )}

      {finance.available ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <WalletCards className="h-4 w-4 text-blue-700" />
              <h3 className="text-sm font-bold text-slate-900">Pagos y abonos</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {finance.payments.map((payment) => (
                <div key={payment.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {currencyCLP(payment.amount)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(payment.receivedAt)} · {payment.method.replaceAll("_", " ")}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        payment.status === "CONFIRMED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : payment.status === "VOIDED"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {payment.status === "CONFIRMED"
                        ? "Confirmado"
                        : payment.status === "VOIDED"
                          ? "Anulado"
                          : payment.status}
                    </span>
                  </div>
                  {payment.reference ? (
                    <p className="mt-1 text-xs text-slate-600">Referencia: {payment.reference}</p>
                  ) : null}
                  {payment.status === "CONFIRMED" ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Aplicado: {currencyCLP(payment.allocatedAmount)}
                      {payment.creditAmount > 0
                        ? ` · Crédito: ${currencyCLP(payment.creditAmount)}`
                        : ""}
                    </p>
                  ) : payment.voidReason ? (
                    <p className="mt-2 text-xs text-rose-700">Motivo: {payment.voidReason}</p>
                  ) : null}
                </div>
              ))}
              {finance.payments.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  Aún no hay pagos conciliados.
                </div>
              ) : null}
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <CircleDollarSign className="h-4 w-4 text-amber-700" />
              <h3 className="text-sm font-bold text-slate-900">Estado de cuenta</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {finance.receivables.map((receivable) => (
                <div key={receivable.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {receivable.description}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Emitido {formatDate(receivable.issuedAt)}
                        {receivable.dueAt ? ` · Vence ${formatDate(receivable.dueAt)}` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        receivable.status === "PAID"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : receivable.status === "OVERDUE"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {receivable.status === "PAID"
                        ? "Pagado"
                        : receivable.status === "PARTIAL"
                          ? "Abono parcial"
                          : receivable.status === "OVERDUE"
                            ? "Vencido"
                            : receivable.status === "CANCELLED"
                              ? "Cancelado"
                              : "Pendiente"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    <span>Total: {currencyCLP(receivable.totalAmount)}</span>
                    <span>Abonado: {currencyCLP(receivable.appliedAmount)}</span>
                    <span className="font-semibold text-slate-900">
                      Saldo: {currencyCLP(receivable.balanceAmount)}
                    </span>
                  </div>
                </div>
              ))}
              {finance.receivables.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-500">
                  No hay saldos pendientes registrados.
                </div>
              ) : null}
            </div>
          </article>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900">Compras</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <div key={sale.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  {currencyCLP(sale.total || 0)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(sale.createdAt)} · {sale.paymentMethod || "Método no informado"}
                </p>
                {sale.description ? (
                  <p className="mt-1 text-sm text-slate-600">{sale.description}</p>
                ) : null}
              </div>
            ))}
            {sales.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Sin compras registradas.
              </div>
            ) : null}
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <ReceiptText className="h-4 w-4 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">Boletas / comprobantes</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => (
              <div key={doc.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  {doc.type} {doc.documentNumber ? `· ${doc.documentNumber}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(doc.issueDate)} · {doc.paymentStatus || doc.status || "Emitido"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {currencyCLP(doc.totalAmount || 0)}
                </p>
                {doc.pdfUrl ? (
                  <Link
                    href={doc.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800"
                  >
                    Ver comprobante
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            ))}
            {documents.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">
                Sin boletas registradas.
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
