import { FileSpreadsheet } from "lucide-react";

import { ProspectImporter } from "@/components/admin/sales-ai/prospect-importer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Importar prospectos",
};

export default function ImportarProspectosPage() {
  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <FileSpreadsheet className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Importar prospectos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Carga empresas investigadas desde Excel o CSV. El sistema detecta duplicados por RUT,
            correo, dominio, teléfono y nombre antes de importar nada.
          </p>
        </div>
      </header>

      <ProspectImporter />
    </div>
  );
}
