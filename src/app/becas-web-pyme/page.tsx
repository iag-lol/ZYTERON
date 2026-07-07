import { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { Container } from "@/components/layout/container";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { getPublishedScholarshipProfiles } from "@/lib/becas/public-profiles";
import { createPageMetadata } from "@/lib/seo";
import { PublicShowcaseCarousel } from "@/components/becas/public-showcase-carousel";
import { ApplicationModal } from "./_components/application-modal";

export const metadata: Metadata = createPageMetadata({
  title: "Becas Web Pyme: apoyo digital para negocios en Chile",
  description:
    "Postula a las Becas Web Pyme de Zyteron: un programa de apoyo para que emprendedores y pymes en Chile accedan a una presencia web profesional.",
  path: "/becas-web-pyme",
});

export const dynamic = "force-dynamic";

type SelectionCriterion = {
  weight: string;
  description: string;
};

async function getActiveCampaign() {
  try {
    const supabase = getBecasSupabaseClient();
    const { data, error } = await supabase
      .from("scholarship_campaigns")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return data;
  } catch (error) {
    console.warn("No se pudo conectar a Supabase para obtener la campaña", error);
    return null;
  }
}

export default async function BecasWebPymePage() {
  const campaign = await getActiveCampaign();
  const publishedProfiles = await getPublishedScholarshipProfiles(6);

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#eff6ff_0%,#ffffff_45%,#f8fafc_100%)] py-20 text-slate-950">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.22),transparent_68%)]"
        />
        <Container className="text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-blue-700 shadow-sm">
            <Store className="h-4 w-4" />
            Programa Becas Web Pyme
          </span>
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {campaign?.title || "Becas Web Pyme Zyteron"}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-700 sm:text-xl">
            {campaign?.subtitle || "En Zyteron apoyamos a emprendedores y empresas chilenas a dar el siguiente paso digital con una presencia web profesional."}
          </p>
          <p className="mx-auto mb-10 max-w-3xl text-slate-600">
            {campaign?.description || "Postula tu negocio, cuéntanos tu historia y participa en nuestro proceso de selección para recibir una solución web diseñada para impulsar tu presencia digital."}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {campaign ? (
              <ApplicationModal 
                campaignId={campaign.id} 
                officialInstagram={campaign.official_instagram_handle} 
                termsVersion={campaign.terms_version || "v1.0"}
                privacyVersion={campaign.privacy_version || "v1.0"}
              />
            ) : (
              <button disabled className="rounded-xl bg-slate-700 px-8 py-4 font-bold text-slate-400 opacity-50">
                Postulaciones Cerradas
              </button>
            )}
            <a href="#que-incluye" className="rounded-xl border border-slate-300 bg-white px-8 py-4 font-bold text-slate-900 transition-colors hover:bg-slate-50">
              Ver qué incluye
            </a>
            <Link href="/becas-web-pyme/vitrina" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-8 py-4 font-bold text-blue-800 transition-colors hover:bg-blue-100">
              <Store className="h-5 w-5" />
              Ver vitrina de postulantes
            </Link>
            <a href="/becas-web-pyme/bases" className="text-sm font-semibold text-blue-700 underline-offset-4 hover:underline">
              Leer bases
            </a>
          </div>

          {campaign && campaign.ends_at && (
            <p className="mt-8 text-sm font-semibold tracking-wide text-blue-700">
              Edición {new Date(campaign.starts_at).getFullYear()} · Postulaciones abiertas hasta el {new Date(campaign.ends_at).toLocaleDateString('es-CL')}
            </p>
          )}
        </Container>
      </section>

      {publishedProfiles.length > 0 ? (
        <section className="pb-8">
          <Container>
            <PublicShowcaseCarousel
              profiles={publishedProfiles}
              badge="Vitrina pública"
              title="Negocios reales ya se están mostrando con una presencia más seria"
              description="Este carrusel avanza automáticamente y destaca emprendimientos que ya autorizaron su publicación en la vitrina de Becas Web Pyme."
            />
          </Container>
        </section>
      ) : null}

      {/* Qué incluye */}
      <section id="que-incluye" className="py-20">
        <Container>
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">Qué incluye la beca</h2>
          <div className="grid gap-12 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="mb-6 text-xl font-bold text-blue-900">El beneficio incluye</h3>
              <ul className="space-y-3 text-slate-700">
                {(campaign?.included_items || [
                  "Landing page profesional de hasta 3 secciones.",
                  "Diseño responsive para computador y celular.",
                  "Mini panel administrativo para editar productos, servicios o precios.",
                  "Carga inicial de hasta 20 productos o servicios.",
                  "Botón directo a WhatsApp.",
                  "Formulario de contacto.",
                  "Configuración básica de SEO técnico.",
                  "Dominio .cl por 12 meses, sujeto a disponibilidad.",
                  "Hosting por 12 meses.",
                  "Certificado SSL.",
                  "30 días de soporte posterior a la entrega."
                ]).map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 text-green-500">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="mb-6 text-xl font-bold text-slate-900">No incluye</h3>
              <ul className="space-y-3 text-slate-600">
                {(campaign?.excluded_items || [
                  "Tienda online con pagos.",
                  "Reservas complejas.",
                  "Aplicaciones móviles.",
                  "Desarrollo de sistemas a medida.",
                  "Diseño de logo.",
                  "Fotografía profesional.",
                  "Redacción completa de contenidos.",
                  "Integraciones externas no indicadas expresamente.",
                  "Carga masiva de productos.",
                  "Costos de renovación posteriores al período incluido.",
                  "Funcionalidades no descritas en las bases oficiales."
                ]).map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-1 text-red-400">×</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Cómo funciona */}
      <section className="bg-white py-20">
        <Container>
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">Cómo funciona</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-900">1</div>
              <p className="font-semibold text-slate-900">Completa tu postulación.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-900">2</div>
              <p className="font-semibold text-slate-900">Zyteron revisa antecedentes y valida requisitos.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-900">3</div>
              <p className="font-semibold text-slate-900">Se realiza el proceso de selección según las bases.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-900">4</div>
              <p className="font-semibold text-slate-900">Se publica el resultado y comienza el proyecto con el negocio seleccionado.</p>
            </div>
          </div>
          <p className="mt-12 text-center text-sm text-slate-500">
            La selección no depende de likes, comentarios, votos ni cantidad de seguidores. Se evalúan postulaciones válidas según criterios publicados en las bases.
          </p>
        </Container>
      </section>

      {/* Vitrina de postulantes */}
      <section className="bg-white py-20">
        <Container>
          <div className="mb-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <span className="mb-2 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-700">Vitrina pública</span>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Emprendimientos que participan</h2>
              <p className="mt-2 max-w-xl text-slate-600">Negocios reales que autorizaron aparecer aquí mientras postulan a nuestra beca.</p>
            </div>
            <Link
              href="/becas-web-pyme/vitrina"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-6 py-3 text-sm font-bold text-blue-800 transition-colors hover:bg-blue-100"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(135deg,#ffffff,#eff6ff)] p-8 text-center shadow-[0_20px_45px_-35px_rgba(59,130,246,0.45)]">
            <p className="text-slate-600">
              ¿Ya postulaste y autorizaste la vitrina?{" "}
              <Link href="/becas-web-pyme/vitrina" className="font-bold text-blue-700 hover:text-blue-800 underline underline-offset-4">
                Haz click aquí para verte publicado
              </Link>
            </p>
          </div>
        </Container>
      </section>

      {/* Criterios de Selección */}
      <section className="py-20">
        <Container>
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">Criterios de selección</h2>
          <div className="mx-auto max-w-3xl space-y-4">
            {(campaign?.selection_criteria || [
              { weight: "40%", description: "Necesidad real de presencia digital." },
              { weight: "25%", description: "Claridad y completitud de la postulación." },
              { weight: "20%", description: "Factibilidad de desarrollo del proyecto." },
              { weight: "15%", description: "Potencial de impacto para el negocio." }
            ] as SelectionCriterion[]).map((crit, i: number) => (
              <div key={i} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="font-medium text-slate-800">{crit.description}</span>
                <span className="rounded bg-blue-100 px-3 py-1 font-bold text-blue-900">{crit.weight}</span>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-slate-500">
            Zyteron podrá solicitar información adicional únicamente para validar la postulación. La decisión se documentará internamente según los criterios informados.
          </p>
        </Container>
      </section>

      {/* CTA Final */}
      <section className="bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_100%)] py-24 text-center text-slate-950">
        <Container>
          <h2 className="mb-8 text-3xl font-bold sm:text-4xl">Tu negocio puede ser el próximo proyecto que mostremos con orgullo.</h2>
          {campaign ? (
            <ApplicationModal 
              campaignId={campaign.id} 
              officialInstagram={campaign.official_instagram_handle} 
              termsVersion={campaign.terms_version || "v1.0"}
              privacyVersion={campaign.privacy_version || "v1.0"}
              variant="large" 
            />
          ) : null}
          <p className="mt-6 text-sm text-slate-600">Revisa las bases, condiciones y política de privacidad antes de enviar tu postulación.</p>
        </Container>
      </section>
    </main>
  );
}
