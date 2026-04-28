import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Star } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { getWebPricingSnapshot } from "@/lib/web-control";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Planes PyME Zyteron | Chile",
  description:
    "Planes PyME oficiales de Zyteron con condiciones y precios reales para implementación digital.",
  path: "/planes",
  keywords: ["planes pyme chile", "precios pyme zyteron", "cotización web pyme"],
});

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

const badgeBySlug: Record<string, string> = {
  "pyme-basico": "Ahorro PYME",
  "pyme-medio": "Listo para despegar",
  "pyme-avanzado": "Más completo PYME",
};

export default async function PlanesPage() {
  const { plans } = await getWebPricingSnapshot();

  return (
    <main className="bg-white">
      <JsonLd
        id="planes-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/planes",
          title: "Planes PyME Zyteron | Chile",
          description: "Página oficial de planes PyME con detalle de cobertura, beneficios y precios.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Planes", path: "/planes" },
          ],
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Planes</p>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Planes claros, <span className="text-gradient-blue">resultados reales</span>
          </h1>
          <p className="mx-auto max-w-3xl text-lg text-slate-600">
            Elige el plan que se adapta a tu empresa y potencia con extras en el cotizador.
          </p>
        </Container>
      </section>

      <section className="section-alt py-20">
        <Container className="space-y-10">
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const featured = plan.slug === "pyme-avanzado";
              const badge = badgeBySlug[plan.slug] || (plan.popular ? "Más elegido" : "Plan oficial");

              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl p-7 ${
                    featured
                      ? "card-featured text-white"
                      : "card-premium"
                  }`}
                >
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className={`rounded-full px-4 py-1 text-xs font-bold text-white shadow-md ${
                        featured ? "bg-blue-700 shadow-blue-700/40" : "bg-blue-600 shadow-blue-600/30"
                      }`}
                    >
                      {badge}
                    </span>
                  </div>

                  <div className="mb-6 space-y-2">
                    <p className={`text-xs font-bold uppercase tracking-widest ${featured ? "text-blue-200" : "text-slate-400"}`}>
                      {plan.name}
                    </p>
                    <p className={`text-5xl font-extrabold ${featured ? "text-white" : "text-slate-900"}`}>
                      {currency(plan.price)}
                    </p>
                    <p className={`text-xs ${featured ? "text-blue-200" : "text-slate-400"}`}>pago único</p>
                    <p className={`pt-1 text-sm leading-relaxed ${featured ? "text-blue-100" : "text-slate-600"}`}>
                      {plan.description}
                    </p>
                  </div>

                  {plan.freeGifts.length > 0 ? (
                    <div className="mb-5 space-y-1.5">
                      <p className={`mb-2.5 text-xs font-bold uppercase tracking-widest ${featured ? "text-emerald-300" : "text-emerald-700"}`}>
                        Incluye gratis
                      </p>
                      {plan.freeGifts.map((gift) => (
                        <div key={gift} className={`flex items-center gap-2 text-sm ${featured ? "text-emerald-200" : "text-emerald-700"}`}>
                          <Star className="h-3.5 w-3.5 shrink-0" />
                          {gift}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="mb-8 flex-1 space-y-2">
                    {plan.features.map((feature) => (
                      <div key={feature} className={`flex items-start gap-2 text-sm ${featured ? "text-blue-100" : "text-slate-600"}`}>
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-blue-300" : "text-blue-600"}`} />
                        {feature}
                      </div>
                    ))}
                  </div>

                  <Button
                    asChild
                    className={`w-full font-bold ${
                      featured
                        ? "bg-white text-blue-800 hover:bg-blue-50"
                        : "btn-primary-glow bg-blue-700 text-white hover:bg-blue-800"
                    }`}
                  >
                    <Link href="/paquetes">
                      Ir al cotizador <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  <p className={`mt-3 text-center text-xs ${featured ? "text-blue-200" : "text-slate-500"}`}>
                    Respuesta en menos de 24h. Precio cerrado, sin extras obligatorios.
                  </p>
                </article>
              );
            })}
          </div>

          <p className="text-center text-xs text-slate-400">
            * Planes oficiales Zyteron. Para personalización técnica usa el cotizador.
          </p>
        </Container>
      </section>
    </main>
  );
}
