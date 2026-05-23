import Link from "next/link";
import { Download, FolderOpen } from "lucide-react";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return value.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PortalDocumentosPage() {
  const session = await requirePortalSession();
  const docs = await prisma.clientDocument.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 400,
  });

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">Documentos privados</h2>
        <p className="mt-1 text-sm text-slate-600">
          Contratos, respaldos, documentación técnica y archivos de proyecto.
        </p>
      </div>

      {docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">
          <FolderOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Aún no tienes documentos subidos en tu cuenta.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.2fr_0.8fr_0.6fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <span>Documento</span>
            <span>Categoría</span>
            <span>Fecha</span>
            <span className="text-right">Acción</span>
          </div>
          <div className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <div key={doc.id} className="grid grid-cols-[1.2fr_0.8fr_0.6fr_auto] items-center gap-3 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{doc.title}</p>
                  {doc.description ? <p className="text-xs text-slate-500">{doc.description}</p> : null}
                </div>
                <span className="text-slate-600">{doc.category}</span>
                <span className="text-slate-500">{formatDate(doc.createdAt)}</span>
                <div className="text-right">
                  <Link
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Descargar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

