import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { privacyIntro, privacyLastUpdated, privacySections } from "@/content/legal-documents";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Política de privacidad",
  description:
    "Política de privacidad de ZYTERON sobre datos de formularios, cotizaciones, pagos por Flow y comunicación comercial.",
  path: "/privacidad",
});

export default function PrivacidadPage() {
  return (
    <main className="bg-white py-16">
      <Container className="max-w-4xl space-y-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Política de privacidad</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          {privacyIntro}
        </p>

        <div className="space-y-5">
          {privacySections.map((section) => (
            <section key={section.title} className="card-premium p-5">
              <h2 className="text-lg font-bold text-slate-900">{section.title}</h2>
              <div className="mt-2 space-y-2 text-sm text-slate-600">
                {section.points.map((point, index) => (
                  <p key={index}>• {point}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="text-xs text-slate-500">Última actualización: {privacyLastUpdated}.</p>
      </Container>
    </main>
  );
}
