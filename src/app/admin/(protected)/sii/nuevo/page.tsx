import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { TaxDocumentCreateForm } from "@/components/admin/tax-document-create-form";
import { ZYTERON_SII } from "@/lib/company";
import { getClients, getProjects, getQuotes, getSales } from "@/lib/admin/repository";

type Props = {
  searchParams?: Promise<{
    clientId?: string;
    quoteId?: string;
    projectId?: string;
    saleId?: string;
  }>;
};

export default async function NuevoDocumentoSiiPage({ searchParams }: Props) {
  const query = await Promise.resolve(searchParams);
  const [clients, quotes, projects, sales] = await Promise.all([
    getClients(),
    getQuotes(),
    getProjects(),
    getSales(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/sii"
            className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-blue-600 uppercase">
              Facturación conectada
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-950">
              Nuevo documento tributario
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {ZYTERON_SII.issuerName} · RUT {ZYTERON_SII.issuerRut}
            </p>
          </div>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Cliente, proyecto, cotización y saldo vinculados
        </div>
      </header>

      <TaxDocumentCreateForm
        clients={clients.map((client) => ({
          id: client.id,
          name: client.name,
          company: client.company || null,
          email: client.email || null,
          rut: client.rut || null,
        }))}
        quotes={quotes.map((quote) => ({
          id: quote.id,
          clientId: quote.userId || null,
          label: quote.displayNumber,
          status: quote.status || "PENDING",
          netAmount: quote.meta.subtotal,
          taxAmount: quote.meta.iva,
          totalAmount: quote.totalAmount,
        }))}
        projects={projects.map((project) => ({
          id: project.id,
          clientId: project.clientId || null,
          quoteId: project.quoteId || null,
          title: project.title,
        }))}
        sales={sales.map((sale) => ({
          id: sale.id,
          clientId: sale.clientId || null,
          total: sale.total || 0,
          description: sale.description || null,
        }))}
        initial={{
          clientId: query?.clientId || "",
          quoteId: query?.quoteId || "",
          projectId: query?.projectId || "",
          saleId: query?.saleId || "",
        }}
      />
    </div>
  );
}
