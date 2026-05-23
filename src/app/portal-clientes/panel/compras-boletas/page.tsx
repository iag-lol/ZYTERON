import Link from "next/link";
import { ExternalLink, ShoppingCart } from "lucide-react";
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
  const [sales, documents] = await Promise.all([
    prisma.sale.findMany({
      where: { clientId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.taxDocument.findMany({
      where: { clientId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
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
          Total histórico: {currencyCLP(total)}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <h3 className="text-sm font-bold text-slate-900">Compras</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {sales.map((sale) => (
              <div key={sale.id} className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{currencyCLP(sale.total || 0)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(sale.createdAt)} · {sale.paymentMethod || "Método no informado"}
                </p>
                {sale.description ? <p className="mt-1 text-sm text-slate-600">{sale.description}</p> : null}
              </div>
            ))}
            {sales.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">Sin compras registradas.</div>
            ) : null}
          </div>
        </article>

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
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
                <p className="mt-1 text-sm font-semibold text-slate-800">{currencyCLP(doc.totalAmount || 0)}</p>
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
              <div className="px-4 py-10 text-center text-sm text-slate-500">Sin boletas registradas.</div>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}
