"use client";

import Link from "next/link";

export default function PrintButton({
  termsVersion,
  campaignSlug,
}: {
  termsVersion: string;
  campaignSlug?: string;
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap gap-3 print:hidden my-6">
      <button
        onClick={handlePrint}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition flex items-center gap-2"
      >
        <span>🖨️</span>
        <span>Imprimir Bases</span>
      </button>

      <button
        onClick={handlePrint}
        className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition flex items-center gap-2"
      >
        <span>📄</span>
        <span>Descargar PDF</span>
      </button>

      <Link
        href="/becas-web-pyme/privacidad"
        className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition flex items-center gap-2"
      >
        <span>🛡️</span>
        <span>Política de Privacidad</span>
      </Link>

      <Link
        href="/becas-web-pyme/vitrina"
        className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition flex items-center gap-2"
      >
        <span>🌟</span>
        <span>Ver Vitrina de Postulantes</span>
      </Link>

      <Link
        href="/becas-web-pyme"
        className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition flex items-center gap-2"
      >
        <span>←</span>
        <span>Volver a Becas Web Pyme</span>
      </Link>
    </div>
  );
}
