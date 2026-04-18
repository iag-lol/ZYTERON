import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Roadmap interno",
  description: "Roadmap interno de etapas.",
  path: "/roadmap",
  noIndex: true,
});

const phases = [
  { title: "Etapa 1 · Arquitectura base", status: "Listo", detail: "Stack, schema, seeds, SEO base, layout." },
  {
    title: "Etapa 2 · Home premium + estructura",
    status: "En curso",
    detail: "Hero, servicios, planes, productos destacados, FAQs, CTA.",
  },
  {
    title: "Etapa 3 · Servicios, productos, planes full",
    status: "Pendiente",
    detail: "Catálogos completos, filtros, contenido SEO por servicio.",
  },
  { title: "Etapa 4 · Constructor de paquetes", status: "Pendiente", detail: "Flujo interactivo 3 pasos + resumen." },
  { title: "Etapa 5 · Autenticación y panel cliente", status: "Pendiente", detail: "Registro, login, solicitudes, tickets." },
  { title: "Etapa 6 · Panel admin", status: "Pendiente", detail: "Gestión total de contenidos, SEO editable, leads." },
  { title: "Etapa 7 · SEO técnico completo", status: "Pendiente", detail: "Metadatos por página, schema avanzado, sitemap dinámico." },
  { title: "Etapa 8 · Pulido final", status: "Pendiente", detail: "Responsive, performance, UX premium." },
];

export default function RoadmapPage() {
  return (
    <main className="pb-16 pt-16">
      <Container className="space-y-10">
        <header className="space-y-3">
          <Badge className="border-primary/20 bg-primary/10 text-primary">Roadmap</Badge>
          <h1 className="text-3xl font-semibold text-slate-900">Fases de entrega</h1>
          <p className="max-w-3xl text-slate-600">
            Visibilidad de avance para asegurar que cada etapa quede productiva y SEO-ready antes de pasar a la
            siguiente.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {phases.map((phase) => (
            <Card key={phase.title} className="border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg text-slate-900">{phase.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-slate-700">
                <p className="font-semibold text-primary">{phase.status}</p>
                <p>{phase.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </main>
  );
}
