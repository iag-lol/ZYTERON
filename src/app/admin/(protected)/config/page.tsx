import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";

export default function ConfigPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Configuración</p>
        <h1 className="text-2xl font-semibold text-slate-900">SEO y contenido administrable (próximo)</h1>
        <p className="text-sm text-slate-600">
          Aquí se habilitará edición de meta title, description, slug, canonicals, OG, FAQs y esquema por página.
        </p>
      </div>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-slate-900">Estado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-700">En roadmap</Badge>
            <span>Edición SEO por página y bloques de contenido</span>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Editable activo</p>
            <p className="mt-1 text-sm text-blue-800">
              La gestión editable de productos, precios, descuentos y comentarios está en
              <span className="font-bold"> Control Web</span>.
            </p>
            <Link
              href="/admin/control-web"
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Ir a Control Web
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
