import { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { ApplicationModal } from "./_components/application-modal";

export const metadata: Metadata = {
  title: "Becas Web Pyme Zyteron | Apoyo Digital para Negocios en Chile",
  description: "En Zyteron apoyamos a emprendedores y empresas chilenas a dar el siguiente paso digital con una presencia web profesional.",
};

export const dynamic = "force-dynamic";

async function getActiveCampaign() {
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
}

export default async function BecasWebPymePage() {
  const campaign = await getActiveCampaign();

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-900 to-slate-900 py-20 text-white">
        <Container className="text-center">
          <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            {campaign?.title || "Becas Web Pyme Zyteron"}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-blue-100 sm:text-xl">
            {campaign?.subtitle || "En Zyteron apoyamos a emprendedores y empresas chilenas a dar el siguiente paso digital con una presencia web profesional."}
          </p>
          <p className="mx-auto mb-10 max-w-3xl text-slate-300">
            {campaign?.description || "Postula tu negocio, cuéntanos tu historia y participa en nuestro proceso de selección para recibir una solución web diseñada para impulsar tu presencia digital."}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            {campaign ? (
              <ApplicationModal campaignId={campaign.id} officialInstagram={campaign.official_instagram_handle} />
            ) : (
              <button disabled className="rounded-xl bg-slate-700 px-8 py-4 font-bold text-slate-400 opacity-50">
                Postulaciones Cerradas
              </button>
            )}
            <a href="#que-incluye" className="rounded-xl border border-white/20 px-8 py-4 font-bold text-white transition-colors hover:bg-white/10">
              Ver qué incluye
            </a>
            <a href="/becas-web-pyme/bases" className="text-sm font-semibold text-blue-300 underline-offset-4 hover:underline">
              Leer bases
            </a>
          </div>

          {campaign && campaign.ends_at && (
            <p className="mt-8 text-sm font-semibold tracking-wide text-blue-300">
              Edición {new Date(campaign.starts_at).getFullYear()} · Postulaciones abiertas hasta el {new Date(campaign.ends_at).toLocaleDateString('es-CL')}
            </p>
          )}
        </Container>
      </section>

      {/* Qué incluye */}
      <section id="que-incluye" className="py-20">
        <Container>
          <h2 className="mb-12 text-center text-3xl font-bold text-slate-900">Qué incluye la beca</h2>
          <div className="grid gap-12 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="mb-6 text-xl font-bold text-blue-900">El beneficio incluye</h3>
              <ul className="space-y-3 text-slate-700">
                {(campaign?.included_items || [
                  "Landing page profesional de hasta 6 secciones.",
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
            ]).map((crit: any, i: number) => (
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
      <section className="bg-slate-900 py-24 text-center text-white">
        <Container>
          <h2 className="mb-8 text-3xl font-bold sm:text-4xl">Tu negocio puede ser el próximo proyecto que mostremos con orgullo.</h2>
          {campaign ? (
            <ApplicationModal campaignId={campaign.id} officialInstagram={campaign.official_instagram_handle} variant="large" />
          ) : null}
          <p className="mt-6 text-sm text-slate-400">Revisa las bases, condiciones y política de privacidad antes de enviar tu postulación.</p>
        </Container>
      </section>
    </main>
  );
}
