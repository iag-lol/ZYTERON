import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileEdit } from "lucide-react";
import { getQuoteById } from "@/lib/admin/repository";
import { QuoteEditForm } from "@/components/admin/quote-edit-form";

type Params = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditarCotizacionPage({ params }: Params) {
  const { id } = await params;
  const quote = await getQuoteById(id);

  if (!quote) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href={`/admin/cotizaciones/${quote.id}`}
            className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Edición comercial</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Editar {quote.displayNumber}</h1>
            <p className="mt-1 text-sm text-slate-500">Actualizará el mismo registro en Supabase y regenerará PDF.</p>
          </div>
        </div>

        <Link
          href={`/admin/cotizaciones/${quote.id}`}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          <FileEdit className="h-4 w-4" />
          Ver ficha
        </Link>
      </div>

      <QuoteEditForm quote={quote} />
    </div>
  );
}

