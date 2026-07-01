import { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import ReactMarkdown from "react-markdown";
import PrintButton from "../_components/print-button";

export const metadata: Metadata = {
  title: "Bases Oficiales | Becas Web Pyme Zyteron",
  description: "Bases y condiciones oficiales para postular a las Becas Web Pyme de Zyteron.",
};

export const dynamic = "force-dynamic";

export default async function BasesPage({
  searchParams,
}: {
  searchParams?: { edicion?: string };
}) {
  let campaign = null;
  let termsVersion = null;

  try {
    const supabase = getBecasSupabaseClient();
    
    if (searchParams?.edicion) {
      const { data } = await supabase
        .from("scholarship_campaigns")
        .select("*")
        .eq("slug", searchParams.edicion)
        .neq("status", "draft")
        .single();
      campaign = data;
    } else {
      const { data } = await supabase
        .from("scholarship_campaigns")
        .select("*")
        .in("status", ["active", "paused", "closed", "reviewing", "winner_pending_acceptance", "winner_published", "scheduled"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      campaign = data;
    }

    if (campaign?.current_terms_version_id) {
      const { data: vData } = await supabase
        .from("scholarship_legal_versions")
        .select("*")
        .eq("id", campaign.current_terms_version_id)
        .single();
      termsVersion = vData;
    } else if (campaign?.id) {
      const { data: vData } = await supabase
        .from("scholarship_legal_versions")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("document_type", "terms")
        .eq("is_current", true)
        .maybeSingle();
      termsVersion = vData;
    }
  } catch (error) {
    console.warn("No se pudo conectar a Supabase para obtener las bases", error);
  }

  // SI NO HAY CAMPAÑA PÚBLICA / ACTIVA
  if (!campaign) {
    return (
      <main className="min-h-screen bg-slate-50 py-20">
        <Container className="max-w-3xl text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
            <h1 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl">
              Bases Oficiales: Becas Web Pyme Zyteron
            </h1>
            <p className="text-base text-slate-600 leading-relaxed max-w-xl mx-auto">
              Las Bases Web Pyme no tienen una convocatoria activa en este momento. Revisa próximamente nuestras redes y esta página para conocer futuras ediciones.
            </p>
            <div className="mt-8">
              <a
                href="/becas-web-pyme"
                className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition"
              >
                Volver al Inicio de Becas
              </a>
            </div>
          </div>
        </Container>
      </main>
    );
  }

  // REEMPLAZO DE VARIABLES DINÁMICAS EN PLANTILLA
  const rawTerms = termsVersion?.content_markdown || campaign.terms_content || "Las bases oficiales están siendo cargadas por el equipo de administración.";
  
  const replaceVars = (text: string) => {
    return text
      .replace(/{{CAMPAIGN_NAME}}/g, campaign.title || "Edición 2026")
      .replace(/{{ORGANIZER_LEGAL_NAME}}/g, campaign.organizer_legal_name || "Zyteron SpA")
      .replace(/{{ORGANIZER_RUT}}/g, campaign.organizer_rut || "No informado")
      .replace(/{{ORGANIZER_ADDRESS}}/g, campaign.organizer_address || "Santiago, Chile")
      .replace(/{{CONTACT_EMAIL}}/g, campaign.organizer_contact_email || "contacto@zyteron.cl")
      .replace(/{{PRIVACY_EMAIL}}/g, campaign.privacy_contact_email || "privacidad@zyteron.cl")
      .replace(/{{START_DATE}}/g, campaign.starts_at ? new Date(campaign.starts_at).toLocaleDateString('es-CL') : "Por definir")
      .replace(/{{START_TIME}}/g, campaign.starts_at ? new Date(campaign.starts_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : "00:00")
      .replace(/{{END_DATE}}/g, campaign.ends_at ? new Date(campaign.ends_at).toLocaleDateString('es-CL') : "Por definir")
      .replace(/{{END_TIME}}/g, campaign.ends_at ? new Date(campaign.ends_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : "23:59")
      .replace(/{{APPLICATION_URL}}/g, "https://zyteron.cl/becas-web-pyme")
      .replace(/{{OFFICIAL_INSTAGRAM_HANDLE}}/g, campaign.official_instagram_handle ? `@${campaign.official_instagram_handle}` : "@zyteron.cl")
      .replace(/{{BENEFITS_QUANTITY}}/g, (campaign.benefits_quantity || 1).toString())
      .replace(/{{BENEFIT_TITLE}}/g, campaign.benefit_title || "Página Web Profesional")
      .replace(/{{BENEFIT_VALUE_CLP}}/g, campaign.benefit_value_clp ? campaign.benefit_value_clp.toLocaleString('es-CL') : "0")
      .replace(/{{INCLUDED_ITEMS}}/g, Array.isArray(campaign.included_items) ? campaign.included_items.map((item: string) => `- ${item}`).join("\n") : (campaign.included_items || "- Diseño web completo\n- Hosting y Dominio por 1 año"))
      .replace(/{{EXCLUDED_ITEMS}}/g, Array.isArray(campaign.excluded_items) ? campaign.excluded_items.map((item: string) => `- ${item}`).join("\n") : (campaign.excluded_items || "- Publicidad pagada\n- Funcionalidades avanzadas no acordadas"))
      .replace(/{{SELECTION_DATE}}/g, campaign.selection_starts_at ? new Date(campaign.selection_starts_at).toLocaleDateString('es-CL') : "Por definir")
      .replace(/{{ANNOUNCEMENT_DATE}}/g, campaign.announcement_at ? new Date(campaign.announcement_at).toLocaleDateString('es-CL') : "Por definir")
      .replace(/{{RESULTS_PUBLICATION_CHANNELS}}/g, campaign.public_results_url || "Sitio web oficial de Zyteron e Instagram")
      .replace(/{{WINNER_RESPONSE_DAYS}}/g, (campaign.winner_response_days || 5).toString())
      .replace(/{{TERMS_VERSION}}/g, termsVersion?.version_number || campaign.terms_version || "v1.0")
      .replace(/{{PUBLISHED_AT}}/g, termsVersion?.published_at ? new Date(termsVersion.published_at).toLocaleDateString('es-CL') : (campaign.legal_documents_published_at ? new Date(campaign.legal_documents_published_at).toLocaleDateString('es-CL') : new Date().toLocaleDateString('es-CL')))
      .replace(/{{LAST_UPDATED_AT}}/g, termsVersion?.updated_at ? new Date(termsVersion.updated_at).toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : new Date(campaign.updated_at).toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }));
  };

  const renderedTerms = replaceVars(rawTerms);
  const versionNum = termsVersion?.version_number || campaign.terms_version || "v1.0";
  const updatedStr = termsVersion?.updated_at 
    ? new Date(termsVersion.updated_at).toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) 
    : new Date(campaign.updated_at).toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const statusMap: Record<string, string> = {
    active: "Postulaciones abiertas",
    reviewing: "En revisión",
    winner_pending_acceptance: "En revisión",
    winner_published: "Resultado publicado",
    closed: "Edición finalizada",
    paused: "Convocatoria pausada",
    scheduled: "Próxima apertura",
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 print:bg-white print:py-0">
      <Container className="max-w-4xl">
        {/* ENCABEZADO OFICIAL */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:border-none print:p-0 print:shadow-none">
          <div className="flex items-center justify-between border-b border-slate-100 pb-6 print:pb-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl print:text-2xl">
                Bases Oficiales: Becas Web Pyme Zyteron
              </h1>
              <p className="mt-2 text-sm font-semibold text-blue-600 print:text-slate-800">
                En Zyteron apoyamos a emprendedores, Pymes y empresas chilenas a fortalecer su presencia digital.
              </p>
            </div>
            <div className="hidden print:block text-right">
              <span className="text-xl font-black text-slate-900">ZYTERON</span>
              <span className="block text-xs text-slate-500">Documento Oficial</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 text-xs text-slate-600 sm:grid-cols-2 md:grid-cols-3 print:grid-cols-2 print:gap-2">
            <div>
              <span className="font-bold text-slate-900">Edición:</span> {campaign.title}
            </div>
            <div>
              <span className="font-bold text-slate-900">Estado:</span>{" "}
              <span className="font-semibold text-blue-700">
                {statusMap[campaign.status] || campaign.status}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-900">Versión de bases:</span> {versionNum}
            </div>
            <div>
              <span className="font-bold text-slate-900">Última actualización:</span> {updatedStr}
            </div>
            <div className="sm:col-span-2">
              <span className="font-bold text-slate-900">Vigencia:</span> Desde{" "}
              {campaign.starts_at ? new Date(campaign.starts_at).toLocaleDateString('es-CL') : 'Por definir'} hasta{" "}
              {campaign.ends_at ? new Date(campaign.ends_at).toLocaleDateString('es-CL') : 'Por definir'}
            </div>
            <div className="sm:col-span-3">
              <span className="font-bold text-slate-900">Zona horaria:</span> Chile continental, {campaign.campaign_timezone || 'America/Santiago'}
            </div>
          </div>

          <PrintButton termsVersion={versionNum} campaignSlug={campaign.slug} />
        </div>

        {/* CONTENIDO DE LAS BASES */}
        <div className="prose prose-slate max-w-none rounded-2xl border border-slate-200 bg-white p-8 shadow-sm lg:prose-lg print:border-none print:p-0 print:shadow-none print:prose-sm">
          <ReactMarkdown>{renderedTerms}</ReactMarkdown>
        </div>

        {/* PIE DE PÁGINA / FIRMA EN IMPRESIÓN */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600 shadow-sm print:border-none print:mt-8 print:p-0 print:text-left">
          <div className="print:flex print:items-center print:justify-between print:border-t print:pt-6">
            <div>
              <p className="font-bold text-slate-900">{campaign.organizer_legal_name || "Zyteron SpA"}</p>
              <p className="text-xs text-slate-500">RUT: {campaign.organizer_rut || "No informado"}</p>
              <p className="text-xs text-slate-500">Contacto Legal: {campaign.organizer_contact_email || "contacto@zyteron.cl"}</p>
            </div>
            <div className="hidden print:block text-right text-xs text-slate-400">
              <p>Impreso el {new Date().toLocaleDateString('es-CL')} - Versión {versionNum}</p>
              <p>Verificación: https://zyteron.cl/becas-web-pyme/bases</p>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
