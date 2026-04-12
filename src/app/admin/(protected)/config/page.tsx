import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        <CardContent className="flex items-center gap-2 text-sm text-slate-700">
          <Badge className="bg-amber-100 text-amber-700">En roadmap</Badge>
          <span>Edición SEO por página y bloques de contenido</span>
        </CardContent>
      </Card>
    </div>
  );
}
