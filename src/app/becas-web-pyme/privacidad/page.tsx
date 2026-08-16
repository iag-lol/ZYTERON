import { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad y Vitrina | Becas Web Pyme Zyteron",
  description: "Política de privacidad, tratamiento de datos y condiciones de vitrina de Becas Web Pyme Zyteron.",
  alternates: { canonical: "https://www.zyteron.cl/becas-web-pyme/privacidad" },
};

export const dynamic = "force-dynamic";

export default async function PrivacidadPage() {
  let campaign = null;
  let privacyVersion = null;

  try {
    const supabase = getBecasSupabaseClient();
    const { data } = await supabase
      .from("scholarship_campaigns")
      .select("*")
      .in("status", ["active", "paused", "closed", "reviewing", "winner_pending_acceptance", "winner_published", "scheduled"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
      
    campaign = data;

    if (campaign?.current_privacy_version_id) {
      const { data: vData } = await supabase
        .from("scholarship_legal_versions")
        .select("*")
        .eq("id", campaign.current_privacy_version_id)
        .single();
      privacyVersion = vData;
    } else if (campaign?.id) {
      const { data: vData } = await supabase
        .from("scholarship_legal_versions")
        .select("*")
        .eq("campaign_id", campaign.id)
        .eq("document_type", "privacy")
        .eq("is_current", true)
        .maybeSingle();
      privacyVersion = vData;
    }
  } catch (error) {
    console.warn("Error cargando política de privacidad:", error);
  }

  const rawPrivacy = privacyVersion?.content_markdown || campaign?.privacy_content || `# Política de Privacidad y Vitrina - Becas Web Pyme Zyteron

## 1. Responsable del tratamiento
El responsable del tratamiento de los datos personales es ${campaign?.organizer_legal_name || "Zyteron SpA"}, RUT ${campaign?.organizer_rut || "No informado"}.

## 2. Datos que se recopilan
Recopilamos información de contacto, datos del negocio y logo representativo.

## 3. Finalidades de uso
Gestionar la convocatoria, validar requisitos y comunicar resultados.

## 4. Consentimientos y Autorizaciones
Los datos obligatorios se utilizan exclusivamente para gestionar y validar la postulación. La autorización para recibir información comercial y para aparecer en la vitrina pública es independiente, voluntaria y puede revocarse.`;

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <Container className="max-w-4xl">
        {/* ENCABEZADO */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Política de Privacidad y Vitrina
          </h1>
          <p className="mt-2 text-lg font-bold text-blue-600">
            Becas Web Pyme Zyteron
          </p>
          <p className="mt-4 text-xs text-slate-500">
            Versión: {privacyVersion?.version_number || campaign?.privacy_version || "v1.0"} - Última actualización: {privacyVersion?.updated_at ? new Date(privacyVersion.updated_at).toLocaleDateString("es-CL") : new Date().toLocaleDateString("es-CL")}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/becas-web-pyme/bases"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition"
            >
              ← Ver Bases Oficiales
            </Link>
            <Link
              href="/becas-web-pyme"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Volver a la Postulación
            </Link>
          </div>
        </div>

        {/* RECUADROS LEGALES MANDATORIOS */}
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
            <h3 className="font-bold text-blue-900 text-sm mb-2">🔒 Separación de Fines</h3>
            <p className="text-xs text-blue-800 leading-relaxed font-medium">
              Los datos obligatorios se utilizan exclusivamente para gestionar y validar la postulación. La autorización para recibir información comercial y para aparecer en la vitrina pública es independiente, voluntaria y puede revocarse.
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
            <h3 className="font-bold text-blue-900 text-sm mb-2">🛡️ Protección de Datos</h3>
            <p className="text-xs text-blue-800 leading-relaxed font-medium">
              Zyteron no publicará RUT, correo, WhatsApp, respuestas privadas, documentos, códigos de postulación, puntajes ni antecedentes tributarios de las personas participantes.
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
            <h3 className="font-bold text-blue-900 text-sm mb-2">⚖️ Imparcialidad en Selección</h3>
            <p className="text-xs text-blue-800 leading-relaxed font-medium">
              La autorización de vitrina no aumenta ni reduce las posibilidades de selección.
            </p>
          </div>
        </div>

        {/* CONTENIDO DE LA POLÍTICA */}
        <div className="prose prose-slate max-w-none rounded-2xl border border-slate-200 bg-white p-8 shadow-sm lg:prose-lg">
          <ReactMarkdown>{rawPrivacy}</ReactMarkdown>
        </div>

        {/* SECCIÓN DE RETIRO Y CONTACTO */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-100 p-6 text-center">
          <h4 className="font-bold text-slate-800 mb-2">¿Necesitas ejercer tus derechos ARCO o retirar tu postulación?</h4>
          <p className="text-sm text-slate-600 mb-4">
            Puedes solicitar acceso, rectificación, retiro de vitrina o baja comercial enviando un correo directamente a nuestro encargado legal y de privacidad.
          </p>
          <a
            href={`mailto:${campaign?.privacy_contact_email || "privacidad@zyteron.cl"}?subject=Solicitud%20Privacidad%20Becas%20Web%20Pyme`}
            className="inline-block rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            ✉️ Contactar: {campaign?.privacy_contact_email || "privacidad@zyteron.cl"}
          </a>
        </div>
      </Container>
    </main>
  );
}
