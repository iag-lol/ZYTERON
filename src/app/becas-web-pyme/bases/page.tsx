import { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import ReactMarkdown from "react-markdown";

export const metadata: Metadata = {
  title: "Bases Oficiales | Becas Web Pyme Zyteron",
  description: "Bases y condiciones oficiales para postular a las Becas Web Pyme de Zyteron.",
};

export const dynamic = "force-dynamic";

export default async function BasesPage() {
  let campaign = null;

  try {
    const supabase = getBecasSupabaseClient();
    
    const { data } = await supabase
      .from("scholarship_campaigns")
      .select("*")
      .eq("status", "active")
      .limit(1)
      .single();
      
    campaign = data;
  } catch (error) {
    console.warn("No se pudo conectar a Supabase para obtener las bases", error);
  }

  return (
    <main className="min-h-screen bg-slate-50 py-20">
      <Container className="max-w-4xl">
        <div className="mb-12">
          <h1 className="mb-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">Bases Oficiales: Becas Web Pyme</h1>
          <p className="text-sm text-slate-500">
            Última actualización: {campaign ? new Date(campaign.updated_at).toLocaleDateString('es-CL') : 'No disponible'}
          </p>
          <div className="mt-4 flex gap-4">
            <button className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => {/* En el frontend real usar window.print() pero acá en server component podemos usar un helper client side, o dejar un script tag simple */}}>
              Imprimir Bases
            </button>
          </div>
        </div>

        <div className="prose prose-slate max-w-none rounded-xl border border-slate-200 bg-white p-8 shadow-sm lg:prose-lg">
          {campaign?.terms_content ? (
            <ReactMarkdown>{campaign.terms_content}</ReactMarkdown>
          ) : (
            <p>Las bases no están disponibles en este momento. Por favor revisa más tarde.</p>
          )}
        </div>

        <div className="mt-12 rounded-xl bg-blue-50 p-8">
          <h2 className="mb-4 text-xl font-bold text-blue-900">Política de Privacidad y Vitrina</h2>
          <div className="prose prose-sm prose-slate max-w-none">
            {campaign?.privacy_content ? (
              <ReactMarkdown>{campaign.privacy_content}</ReactMarkdown>
            ) : null}
            <hr className="my-4 border-blue-200" />
            {campaign?.public_gallery_terms_content ? (
              <ReactMarkdown>{campaign.public_gallery_terms_content}</ReactMarkdown>
            ) : null}
            <hr className="my-4 border-blue-200" />
            <p className="text-xs text-slate-500">
              {campaign?.instagram_disclaimer || "Esta campaña no está patrocinada, avalada, administrada ni asociada con Instagram. Cada participante libera a Instagram de cualquier responsabilidad vinculada a esta campaña."}
            </p>
          </div>
        </div>
      </Container>
      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelector('button')?.addEventListener('click', function() {
          window.print();
        });
      `}} />
    </main>
  );
}
