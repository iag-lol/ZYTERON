import Link from "next/link";
import { FileDigit } from "lucide-react";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";
import { currencyCLP } from "@/lib/portal/data";

function formatDate(value: Date) {
  return value.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PortalCotizacionesPage() {
  const session = await requirePortalSession();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  const quotes = await prisma.quote.findMany({
    where: user?.email
      ? { OR: [{ userId: session.user.id }, { email: user.email }] }
      : { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">Cotizaciones</h2>
        <p className="mt-1 text-sm text-slate-600">
          Historial de cotizaciones vinculadas a tu cuenta.
        </p>
      </div>

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
                  <p className="font-semibold text-slate-900">#{quote.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-slate-500">{quote.name || "Cotización web"}</p>
                </div>
                <span className="inline-flex w-fit rounded-full border border-blue-100 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
                  {quote.status}
                </span>
                <span className="text-slate-600">{formatDate(quote.createdAt)}</span>
                <div className="text-right font-semibold text-slate-900">{currencyCLP(quote.total || 0)}</div>
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
