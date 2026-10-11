import type { Metadata } from "next";
import { AdminAiConsole } from "@/components/admin/admin-ai-console";

export const metadata: Metadata = {
  title: "Asistente IA · Zyteron Admin",
  robots: { index: false, follow: false },
};

export default function AsistenteIaPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Asistente IA comercial</h1>
        <p className="mt-1 text-sm text-slate-500">
          Genera propuestas de cotización con precios competitivos, analiza requerimientos y crea
          borradores de cotización directamente en el panel.
        </p>
      </div>
      <AdminAiConsole />
    </div>
  );
}
