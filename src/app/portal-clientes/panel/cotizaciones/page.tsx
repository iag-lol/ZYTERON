import Link from "next/link";
import { FileDigit } from "lucide-react";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { enrichQuoteRecord } from "@/lib/admin/quote";
import { normalizeQuoteMetaPayment, quotePaymentRequiresPortalAction } from "@/lib/payments/quote-payments";
import { QuotePaymentActions } from "@/components/portal/panel/quote-payment-actions";
import { prisma } from "@/lib/prisma";
import { currencyCLP } from "@/lib/portal/data";

function formatDate(value?: Date | string | null) {
  const date = value instanceof Date ? value : new Date(value || "");
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type PageProps = {
  searchParams?: Promise<{
    payment_result?: string;
    payment_message?: string;
    payment_label?: string;
  }>;
};

export default async function PortalCotizacionesPage({ searchParams }: PageProps) {
  const session = await requirePortalSession();
  const query = await Promise.resolve(searchParams);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  const rawQuotes = await prisma.quote.findMany({
    where: user?.email
      ? { OR: [{ userId: session.user.id }, { email: user.email }] }
      : { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const quotes = rawQuotes.map((quote) => {
    const enriched = enrichQuoteRecord({
      id: quote.id,
      userId: quote.userId,
      name: quote.name,
      email: quote.email,
      phone: quote.phone,
      company: quote.company,
      message: quote.message,
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.total,
      status: quote.status,
      createdAt: quote.createdAt.toISOString(),
    });

    return {
      ...enriched,
      meta: normalizeQuoteMetaPayment(enriched.meta),
    };
  });
  const actionableQuotes = quotes.filter((quote) => quotePaymentRequiresPortalAction(quote.status, quote.meta.payment));

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">Cotizaciones</h2>
        <p className="mt-1 text-sm text-slate-600">
          Historial comercial, pagos pendientes y validaciones de cobro vinculadas a tu cuenta.
        </p>
      </div>

      {actionableQuotes.length > 0 ? (
        <QuotePaymentActions
          quotes={actionableQuotes.map((quote) => ({
            id: quote.id,
            displayNumber: quote.displayNumber,
            status: quote.status || "PENDING",
            totalAmount: quote.totalAmount,
            pdfUrl: quote.pdfUrl,
            payment: quote.meta.payment,
          }))}
          paymentResult={
            query?.payment_result === "paid" || query?.payment_result === "pending" || query?.payment_result === "error"
              ? query.payment_result
              : null
          }
          paymentMessage={query?.payment_message || null}
          paymentLabel={query?.payment_label || null}
        />
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <span>Referencia</span>
          <span>Estado</span>
          <span>Fecha</span>
          <span className="text-right">Monto</span>
        </div>

        {quotes.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            <FileDigit className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            Aún no hay cotizaciones asociadas a tu cuenta.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {quotes.map((quote) => (
              <div key={quote.id} className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr] items-center gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{quote.displayNumber}</p>
                  <p className="text-xs text-slate-500">{quote.name || "Cotización web"}</p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                  {quote.status}
                </span>
                <span className="text-slate-600">{formatDate(quote.createdAt)}</span>
                <div className="text-right font-semibold text-slate-900">{currencyCLP(quote.totalAmount || 0)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-600">
          Si necesitas una cotización actualizada o descargar un documento firmado, solicita apoyo en{" "}
          <Link className="font-semibold text-blue-700 hover:text-blue-800" href="/portal-clientes/panel/asistencia">
            Asistencia y Ayuda
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
