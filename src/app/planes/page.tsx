import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Check, Star, ArrowRight, Zap, Shield, Globe, TrendingUp } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { getWebPricingSnapshot } from "@/lib/web-control";
import { getSettingsByPrefix } from "@/lib/admin/repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Planes de Diseño y Desarrollo Web Chile | Zyteron",
  description:
    "Revisa planes PyME y Empresa para diseño web, desarrollo web y formalización comercial en Chile.",
  path: "/planes",
  keywords: ["planes pyme chile", "planes empresa chile", "cotización página web empresa"],
});

type PlanLine = "PYME" | "EMPRESA" | "GENERAL";

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

function resolveLine(slug: string, name: string): PlanLine {
  const text = `${slug} ${name}`.toLowerCase();
  if (text.includes("pyme")) return "PYME";
  if (text.includes("empresa")) return "EMPRESA";
  return "GENERAL";
}

function tierWeight(tier: string) {
  if (tier === "BASIC") return 1;
  if (tier === "INTERMEDIATE") return 2;
  return 3;
}

export default async function PlanesPage() {
  const [{ plans: dbPlans }, planExclusions] = await Promise.all([
    getWebPricingSnapshot(),
    getSettingsByPrefix("plan_not_included_"),
  ]);

  const planNotIncludedBySlug = Object.fromEntries(
    planExclusions.map((setting) => {
      const slug = setting.key.replace("plan_not_included_", "");
      try {
        const parsed = JSON.parse(setting.value);
        if (Array.isArray(parsed)) {
          return [slug, parsed.map((item) => String(item).trim()).filter(Boolean)];
        }
      } catch {
        // fallback below
      }
      return [
        slug,
        setting.value
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean),
      ];
    }),
  ) as Record<string, string[]>;

  const plans = dbPlans
    .map((plan) => {
      const line = resolveLine(plan.slug, plan.name);
      return {
        name: plan.name,
        slug: plan.slug,
        line,
        priceValue: plan.price,
        price: currency(plan.price),
        period: "pago único",
        desc: plan.description,
        gifts: plan.freeGifts,
        features: plan.features,
        notIncluded:
          planNotIncludedBySlug[plan.slug] ??
          (plan.tier === "BASIC"
            ? ["Gestión operativa avanzada", "Automatizaciones complejas"]
            : plan.tier === "INTERMEDIATE"
              ? ["Arquitectura enterprise full"]
              : []),
        cta: line === "PYME" ? "Elegir plan PyME" : line === "EMPRESA" ? "Elegir plan Empresa" : "Elegir plan",
        featured: plan.popular || (line === "PYME" && /plus|digital/.test(plan.slug)) || (line === "EMPRESA" && /growth|pro/.test(plan.slug)),
        badge: plan.popular ? "Más elegido" : plan.tier === "PRO" ? "Alta cobertura" : undefined,
        tier: plan.tier,
      };
    })
    .sort((a, b) => {
      if (a.line !== b.line) {
        const order = { PYME: 1, EMPRESA: 2, GENERAL: 3 };
        return order[a.line] - order[b.line];
      }
      if (a.priceValue !== b.priceValue) return a.priceValue - b.priceValue;
      return tierWeight(a.tier) - tierWeight(b.tier);
    });

  const pymePlans = plans.filter((plan) => plan.line === "PYME");
  const empresaPlans = plans.filter((plan) => plan.line === "EMPRESA");
  const generalPlans = plans.filter((plan) => plan.line === "GENERAL");

  return (
    <main className="bg-white">
      <JsonLd
        id="planes-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/planes",
          title: "Planes de Diseño y Desarrollo Web Chile | Zyteron",
          description:
            "Página de planes PyME y Empresa con estructura de servicios clara, comparables y orientados a resultados.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Planes", path: "/planes" },
          ],
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-5">
          <div className="badge-blue">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Planes y precios
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Planes PyME y Empresa
            <span className="text-gradient-blue"> con alcance real</span>
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            Catálogo profesional para formalización, presencia digital y crecimiento comercial. Valores en CLP, pago único e IVA aplicado en cotización.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {[
              { icon: <Shield className="h-3.5 w-3.5" />, text: "Cobertura clara por plan" },
              { icon: <Zap className="h-3.5 w-3.5" />, text: "Implementación con tiempos definidos" },
              { icon: <Globe className="h-3.5 w-3.5" />, text: "Soporte y acompañamiento" },
              { icon: <TrendingUp className="h-3.5 w-3.5" />, text: "Escalable según etapa" },
            ].map((tag) => (
              <span
                key={tag.text}
                className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
              >
                <span className="text-blue-600">{tag.icon}</span>
                {tag.text}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-20">
        <Container className="space-y-12">
          {pymePlans.length > 0 ? (
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Línea PyME</p>
                <h2 className="text-2xl font-extrabold text-slate-900">Formalización y presencia comercial</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {pymePlans.map((plan) => (
                  <article
                    key={plan.slug}
                    className={`relative flex flex-col rounded-2xl p-7 ${
                      plan.featured
                        ? "card-featured text-white"
                        : plan.badge
                          ? "border border-violet-200 bg-white shadow-md shadow-violet-100"
                          : "card-premium"
                    }`}
                  >
                    {plan.badge ? (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span
                          className={`rounded-full px-4 py-1 text-xs font-bold text-white shadow-md ${
                            plan.featured ? "bg-blue-600 shadow-blue-600/40" : "bg-violet-600 shadow-violet-600/40"
                          }`}
                        >
                          {plan.badge}
                        </span>
                      </div>
                    ) : null}

                    <div className="mb-6 space-y-2">
                      <p className={`text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>
                        {plan.name}
                      </p>
                      <p className={`text-4xl font-extrabold ${plan.featured ? "text-white" : "text-slate-900"}`}>{plan.price}</p>
                      <p className={`text-xs ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>{plan.period}</p>
                      <p className={`pt-1 text-sm leading-relaxed ${plan.featured ? "text-blue-100" : "text-slate-600"}`}>{plan.desc}</p>
                    </div>

                    {plan.gifts.length > 0 ? (
                      <div className="mb-5 space-y-1.5">
                        <p className={`mb-2.5 text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-emerald-300" : "text-emerald-700"}`}>
                          Incluye gratis
                        </p>
                        {plan.gifts.map((gift) => (
                          <div key={gift} className={`flex items-center gap-2 text-sm ${plan.featured ? "text-emerald-200" : "text-emerald-700"}`}>
                            <Star className="h-3.5 w-3.5 shrink-0" />
                            {gift}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mb-6 flex-1 space-y-2">
                      <p className={`mb-2.5 text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>
                        Qué incluye
                      </p>
                      {plan.features.map((feature) => (
                        <div key={feature} className={`flex items-start gap-2 text-sm ${plan.featured ? "text-blue-100" : "text-slate-600"}`}>
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? "text-blue-300" : "text-blue-600"}`} />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {plan.notIncluded.length > 0 ? (
                      <div className="mb-6 space-y-2">
                        <p className={`mb-2.5 text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-rose-200" : "text-rose-500"}`}>
                          No incluye
                        </p>
                        {plan.notIncluded.map((item) => (
                          <div key={item} className={`flex items-start gap-2 text-sm ${plan.featured ? "text-rose-100" : "text-slate-500"}`}>
                            <span className={`mt-1.5 inline-block h-1.5 w-1.5 rounded-full ${plan.featured ? "bg-rose-200" : "bg-rose-400"}`} />
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <Button
                      asChild
                      className={`w-full font-bold ${
                        plan.featured
                          ? "bg-white text-blue-800 hover:bg-blue-50"
                          : "btn-primary-glow bg-blue-700 text-white hover:bg-blue-800"
                      }`}
                    >
                      <Link href="/paquetes">{plan.cta}</Link>
                    </Button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {empresaPlans.length > 0 ? (
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Línea Empresa</p>
                <h2 className="text-2xl font-extrabold text-slate-900">Ejecución corporativa y crecimiento digital</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {empresaPlans.map((plan) => (
                  <article
                    key={plan.slug}
                    className={`relative flex flex-col rounded-2xl p-7 ${
                      plan.featured
                        ? "card-featured text-white"
                        : plan.badge
                          ? "border border-violet-200 bg-white shadow-md shadow-violet-100"
                          : "card-premium"
                    }`}
                  >
                    {plan.badge ? (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <span
                          className={`rounded-full px-4 py-1 text-xs font-bold text-white shadow-md ${
                            plan.featured ? "bg-blue-600 shadow-blue-600/40" : "bg-violet-600 shadow-violet-600/40"
                          }`}
                        >
                          {plan.badge}
                        </span>
                      </div>
                    ) : null}

                    <div className="mb-6 space-y-2">
                      <p className={`text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>
                        {plan.name}
                      </p>
                      <p className={`text-4xl font-extrabold ${plan.featured ? "text-white" : "text-slate-900"}`}>{plan.price}</p>
                      <p className={`text-xs ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>{plan.period}</p>
                      <p className={`pt-1 text-sm leading-relaxed ${plan.featured ? "text-blue-100" : "text-slate-600"}`}>{plan.desc}</p>
                    </div>

                    {plan.gifts.length > 0 ? (
                      <div className="mb-5 space-y-1.5">
                        <p className={`mb-2.5 text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-emerald-300" : "text-emerald-700"}`}>
                          Incluye gratis
                        </p>
                        {plan.gifts.map((gift) => (
                          <div key={gift} className={`flex items-center gap-2 text-sm ${plan.featured ? "text-emerald-200" : "text-emerald-700"}`}>
                            <Star className="h-3.5 w-3.5 shrink-0" />
                            {gift}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="mb-6 flex-1 space-y-2">
                      <p className={`mb-2.5 text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>
                        Qué incluye
                      </p>
                      {plan.features.map((feature) => (
                        <div key={feature} className={`flex items-start gap-2 text-sm ${plan.featured ? "text-blue-100" : "text-slate-600"}`}>
                          <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.featured ? "text-blue-300" : "text-blue-600"}`} />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {plan.notIncluded.length > 0 ? (
                      <div className="mb-6 space-y-2">
                        <p className={`mb-2.5 text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-rose-200" : "text-rose-500"}`}>
                          No incluye
                        </p>
                        {plan.notIncluded.map((item) => (
                          <div key={item} className={`flex items-start gap-2 text-sm ${plan.featured ? "text-rose-100" : "text-slate-500"}`}>
                            <span className={`mt-1.5 inline-block h-1.5 w-1.5 rounded-full ${plan.featured ? "bg-rose-200" : "bg-rose-400"}`} />
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <Button
                      asChild
                      className={`w-full font-bold ${
                        plan.featured
                          ? "bg-white text-blue-800 hover:bg-blue-50"
                          : "btn-primary-glow bg-blue-700 text-white hover:bg-blue-800"
                      }`}
                    >
                      <Link href="/paquetes">{plan.cta}</Link>
                    </Button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {generalPlans.length > 0 ? (
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Otros planes</p>
                <h2 className="text-2xl font-extrabold text-slate-900">Opciones complementarias disponibles</h2>
              </div>
              <div className="grid gap-6 md:grid-cols-3">
                {generalPlans.map((plan) => (
                  <article key={plan.slug} className="card-premium flex flex-col rounded-2xl p-7">
                    <div className="mb-6 space-y-2">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{plan.name}</p>
                      <p className="text-4xl font-extrabold text-slate-900">{plan.price}</p>
                      <p className="text-xs text-slate-400">{plan.period}</p>
                      <p className="pt-1 text-sm leading-relaxed text-slate-600">{plan.desc}</p>
                    </div>
                    <div className="mb-6 flex-1 space-y-2">
                      {plan.features.map((feature) => (
                        <div key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                          {feature}
                        </div>
                      ))}
                    </div>
                    <Button asChild className="btn-primary-glow w-full bg-blue-700 font-bold text-white hover:bg-blue-800">
                      <Link href="/paquetes">{plan.cta}</Link>
                    </Button>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          <p className="text-center text-xs text-slate-400">* Valores referenciales en CLP. Revisa el detalle final en el cotizador.</p>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-8">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-extrabold text-slate-900">Resumen de enfoque por línea</h2>
            <p className="text-sm text-slate-600">Selecciona según etapa: formalización PyME o consolidación Empresa.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <article className="card-premium p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">PyME</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900">Ideal para emprendedores y pymes</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />Creación de empresa e inicio de actividades.</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />Acompañamiento para comenzar a facturar con respaldo.</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />Escalamiento a presencia digital y captación inicial.</li>
              </ul>
            </article>
            <article className="card-premium p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Empresa</p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-900">Para operación comercial consolidada</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />Sitios corporativos con trazabilidad de leads y analítica.</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />Integración CRM, SEO y administración de contenidos.</li>
                <li className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />Automatizaciones y performance técnica para escalar.</li>
              </ul>
            </article>
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container>
          <div className="section-blue space-y-5 rounded-2xl p-8 text-center text-white">
            <h3 className="text-2xl font-extrabold">¿Quieres que te recomendemos el plan exacto?</h3>
            <p className="mx-auto max-w-lg text-blue-100">
              Cuéntanos en qué etapa está tu negocio y definimos una ruta de implementación clara para cotizar con precisión.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gap-2 bg-white font-bold text-blue-800 hover:bg-blue-50">
                <Link href="/paquetes">
                  Armar mi paquete <ArrowRight className="h-4 w-4" />
                </Link>
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
