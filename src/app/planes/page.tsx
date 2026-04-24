import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Check, Star, ArrowRight, Zap, Shield, Globe, TrendingUp } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { getWebPricingSnapshot } from "@/lib/web-control";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Planes de Diseno y Desarrollo Web Chile | Zyteron",
  description:
    "Revisa planes y precios de diseno web y desarrollo web para empresas en Chile. Opciones claras, escalables y orientadas a conversion.",
  path: "/planes",
  keywords: ["precios diseno web chile", "planes desarrollo web chile", "cotizacion pagina web empresa"],
});

const comparisons = [
  { feature: "Landing / Sitio web", basic: "Landing extendida", mid: "Sitio 8 secciones", pro: "Corporativo + Blog" },
  { feature: "SEO", basic: "Básico (metas)", mid: "Intermedio on-page", pro: "Avanzado + Schema" },
  { feature: "Formularios", basic: "Contacto + WhatsApp", mid: "Avanzados + analítica", pro: "Avanzados + CRM" },
  { feature: "Hosting + SSL", basic: "3 meses", mid: "6 meses", pro: "12 meses" },
  { feature: "Panel admin", basic: false, mid: false, pro: true },
  { feature: "Blog", basic: false, mid: false, pro: true },
  { feature: "Dominio .cl", basic: false, mid: false, pro: "Gratis 1 año" },
  { feature: "Correo corporativo", basic: false, mid: false, pro: "1 gratis 1 año" },
  { feature: "Capacitación", basic: false, mid: false, pro: "2h incluidas" },
];

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

export default async function PlanesPage() {
  const { plans: dbPlans } = await getWebPricingSnapshot();
  const plans = dbPlans.map((plan) => ({
    name: plan.name,
    price: currency(plan.price),
    period: "pago único",
    desc: plan.description,
    gifts: plan.freeGifts,
    features: plan.features,
    notIncluded:
      plan.tier === "BASIC"
        ? ["Panel de administración", "Blog integrado", "SEO avanzado"]
        : plan.tier === "INTERMEDIATE"
          ? ["Panel admin autónomo", "Dominio .cl (agrégalo como extra)"]
          : [],
    cta:
      plan.tier === "BASIC"
        ? "Comenzar con Básico"
        : plan.tier === "INTERMEDIATE"
          ? "Elegir Plan Intermedio"
          : "Elegir Plan Pro",
    featured: plan.popular || plan.tier === "INTERMEDIATE",
    badge: plan.popular ? "Más popular" : plan.tier === "PRO" ? "Más completo" : undefined,
    tier: plan.tier,
  }));

  return (
    <main className="bg-white">
      <JsonLd
        id="planes-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/planes",
          title: "Planes de Diseno y Desarrollo Web Chile | Zyteron",
          description:
            "Pagina de planes de paginas web para empresas en Chile con comparativa y CTA de cotizacion.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Planes", path: "/planes" },
          ],
        })}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-pattern border-b border-slate-200 py-20">
        <Container className="relative z-10 space-y-5">
          <div className="badge-blue">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Planes y precios
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Planes claros,{" "}
            <span className="text-gradient-blue">sin sorpresas</span>
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Elige el plan base y potencia con extras personalizados. Precios en CLP, pago único sin mensualidades obligatorias.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: <Shield className="h-3.5 w-3.5" />, text: "Sin permanencia forzosa" },
              { icon: <Zap className="h-3.5 w-3.5" />, text: "Entrega garantizada" },
              { icon: <Globe className="h-3.5 w-3.5" />, text: "Soporte post-entrega" },
              { icon: <TrendingUp className="h-3.5 w-3.5" />, text: "ROI medible" },
            ].map((t) => (
              <span key={t.text} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                <span className="text-blue-600">{t.icon}</span>
                {t.text}
              </span>
            ))}
          </div>
        </Container>
      </section>

      {/* Plan Cards */}
      <section className="py-20 section-alt">
        <Container className="space-y-10">
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl p-7 ${
                  plan.featured
                    ? "card-featured text-white"
                    : plan.badge
                    ? "border border-violet-200 bg-white shadow-md shadow-violet-100"
                    : "card-premium"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className={`rounded-full px-4 py-1 text-xs font-bold text-white shadow-md ${plan.featured ? "bg-blue-600 shadow-blue-600/40" : "bg-violet-600 shadow-violet-600/40"}`}>
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="mb-6 space-y-2">
                  <p className={`text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>{plan.name}</p>
                  <p className={`text-4xl font-extrabold ${plan.featured ? "text-white" : "text-slate-900"}`}>{plan.price}</p>
                  <p className={`text-xs ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>{plan.period}</p>
                  <p className={`text-sm leading-relaxed pt-1 ${plan.featured ? "text-blue-100" : "text-slate-600"}`}>{plan.desc}</p>
                </div>

                {plan.gifts.length > 0 && (
                  <div className="mb-5 space-y-1.5">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-2.5 ${plan.featured ? "text-emerald-300" : "text-emerald-700"}`}>Incluye gratis</p>
                    {plan.gifts.map((g) => (
                      <div key={g} className={`flex items-center gap-2 text-sm ${plan.featured ? "text-emerald-200" : "text-emerald-700"}`}>
                        <Star className="h-3.5 w-3.5 shrink-0" />
                        {g}
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-6 space-y-2 flex-1">
                  <p className={`text-xs font-bold uppercase tracking-widest mb-2.5 ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>Qué incluye</p>
                  {plan.features.map((f) => (
                    <div key={f} className={`flex items-start gap-2 text-sm ${plan.featured ? "text-blue-100" : "text-slate-600"}`}>
                      <Check className={`h-4 w-4 shrink-0 mt-0.5 ${plan.featured ? "text-blue-300" : "text-blue-600"}`} />
                      {f}
                    </div>
                  ))}
                </div>

                <Button
                  asChild
                  className={`w-full font-bold ${
                    plan.featured
                      ? "bg-white text-blue-800 hover:bg-blue-50"
                      : "bg-blue-700 hover:bg-blue-800 text-white btn-primary-glow"
                  }`}
                >
                  <Link href="/paquetes">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-400">
            * Precios en pesos chilenos (CLP). Extras disponibles en el cotizador.
          </p>
        </Container>
      </section>

      {/* Comparison table */}
      <section className="py-16 bg-white">
        <Container className="space-y-8">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900">Comparativa detallada</h2>
            <p className="text-slate-600 text-sm">Qué incluye cada plan de un vistazo.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="py-3 pr-4 pl-5 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Característica</th>
                  {[
                    { name: "Básico", featured: false },
                    { name: "Intermedio", featured: true },
                    { name: "Pro", featured: false },
                  ].map((n) => (
                    <th key={n.name} className={`py-3 px-4 text-center text-xs font-bold uppercase tracking-widest ${n.featured ? "text-blue-700 bg-blue-50" : "text-slate-500"}`}>{n.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisons.map((row) => (
                  <tr key={row.feature} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 pr-4 pl-5 text-slate-700 font-medium">{row.feature}</td>
                    {[row.basic, row.mid, row.pro].map((val, j) => (
                      <td key={j} className={`py-3 px-4 text-center ${j === 1 ? "bg-blue-50/50" : ""}`}>
                        {val === false ? (
                          <span className="text-slate-300 font-bold">—</span>
                        ) : val === true ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-700 mx-auto">
                            <Check className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="text-slate-700 text-xs">{val}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* CTA */}
      <section className="py-16 section-alt">
        <Container>
          <div className="rounded-2xl section-blue p-8 text-white text-center space-y-5">
            <h3 className="text-2xl font-extrabold">¿No sabes cuál elegir?</h3>
            <p className="text-blue-100 mx-auto max-w-lg">
              Cuéntanos tu proyecto y te recomendamos el plan más adecuado. Sin compromiso, sin costo.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gap-2 bg-white text-blue-800 hover:bg-blue-50 font-bold">
                <Link href="/paquetes">Armar mi paquete <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                <Link href="/contacto">Hablar con un ejecutivo</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
