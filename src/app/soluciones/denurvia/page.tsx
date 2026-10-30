import Link from "next/link";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { createPageMetadata } from "@/lib/seo";

const origin = "https://denurvia.zyteron.cl";
const path = "/soluciones/denurvia";
const description = "Denurvia es el software de Zyteron SpA diseñado para organizar investigaciones internas y laborales en empresas de Chile. Conoce su alcance y explora la demostración.";

export const metadata = createPageMetadata({
  title: "Denurvia: software para investigaciones internas y laborales",
  description,
  path,
});

const features = [
  ["Expedientes y responsables", "Organización de casos, equipos asignados, etapas y actuaciones en un mismo flujo de trabajo."],
  ["Entrevistas y documentación", "Preparación de preguntas, registro de respuestas y documentos vinculados al expediente."],
  ["Accesos por función", "Evaluación de permisos por empresa, sucursal y asignación, con separación entre administración comercial e investigaciones."],
];

export default function DenurviaPage() {
  return (
    <>
      <section className="bg-slate-950 py-20 text-white sm:py-28">
        <Container>
          <nav aria-label="Ruta de navegación" className="mb-8 text-sm text-slate-300"><Link href="/">Zyteron</Link><span aria-hidden="true"> / </span><span>Denurvia</span></nav>
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">Un producto de Zyteron SpA</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">Denurvia: investigaciones internas con un flujo de trabajo claro.</h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">Software diseñado para organizar investigaciones internas y laborales en empresas de Chile. Conecta expedientes, responsables, entrevistas y documentación para Recursos Humanos, cumplimiento y equipos investigadores.</p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href={origin} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500">Conocer Denurvia</a>
            <a href="https://demo.denurvia.zyteron.cl/" className="rounded-xl border border-slate-500 px-6 py-3 font-semibold text-white hover:bg-slate-800">Explorar demo con datos ficticios</a>
          </div>
        </Container>
      </section>
      <Container className="space-y-14 py-16">
        <section aria-labelledby="alcance">
          <h2 id="alcance" className="text-3xl font-bold text-slate-950">Del ingreso del caso a su documentación</h2>
          <p className="mt-4 max-w-3xl text-slate-600">La evaluación permite revisar el recorrido del caso y contrastar las funciones con el procedimiento de cada empresa.</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">{features.map(([title, text]) => <article key={title} className="rounded-2xl border border-slate-200 p-7"><h3 className="text-xl font-semibold text-slate-950">{title}</h3><p className="mt-3 leading-relaxed text-slate-600">{text}</p></article>)}</div>
        </section>
        <section className="rounded-2xl bg-slate-50 p-8 sm:p-10">
          <h2 className="text-2xl font-bold text-slate-950">Una evaluación con alcance definido</h2>
          <p className="mt-4 leading-relaxed text-slate-700">Denurvia se presenta mediante una demostración con información ficticia y una evaluación coordinada. Las funciones incluidas, integraciones, condiciones y fecha de activación se confirman en la propuesta comercial y el contrato.</p>
          <p className="mt-4 leading-relaxed text-slate-700">El software apoya la organización del procedimiento. No determina responsabilidades ni garantiza por sí solo el cumplimiento de la Ley Karin. Las decisiones requieren revisión humana y el criterio profesional correspondiente.</p>
          <p className="mt-4 leading-relaxed text-slate-700">La asistencia con inteligencia artificial se evalúa como una integración independiente, con alcance y condiciones de tratamiento de información acordados antes de habilitarla.</p>
          <a className="mt-6 inline-block font-semibold text-blue-700 underline underline-offset-4" href={`${origin}/prueba-gratis`}>Coordinar una evaluación de Denurvia</a>
        </section>
        <section>
          <h2 className="text-2xl font-bold text-slate-950">Información oficial del producto</h2>
          <ul className="mt-5 grid gap-4 text-blue-700 sm:grid-cols-2">
            <li><a className="underline underline-offset-4" href={`${origin}/ficha-del-software`}>Ficha del software y planes</a></li>
            <li><a className="underline underline-offset-4" href={`${origin}/seguridad`}>Seguridad y alcance</a></li>
            <li><a className="underline underline-offset-4" href={`${origin}/como-elegir-software-denuncias`}>Criterios para evaluar un software de denuncias</a></li>
            <li><a className="underline underline-offset-4" href={`${origin}/privacidad`}>Privacidad</a></li>
          </ul>
          <p className="mt-8 text-sm text-slate-500">Responsable del producto: Zyteron SpA. Atención remota en Chile. Contacto comercial: <a className="underline" href="mailto:contacto@zyteron.cl">contacto@zyteron.cl</a>.</p>
        </section>
      </Container>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [
        { "@type": "WebPage", "@id": `https://www.zyteron.cl${path}#page`, url: `https://www.zyteron.cl${path}`, name: "Denurvia: software para investigaciones internas y laborales", description, inLanguage: "es-CL", about: { "@id": `${origin}/#software` }, publisher: { "@id": "https://www.zyteron.cl/#organization" } },
        { "@type": "SoftwareApplication", "@id": `${origin}/#software`, name: "Denurvia", alternateName: "Denurvia By Zyteron", url: `${origin}/ficha-del-software`, applicationCategory: "BusinessApplication", operatingSystem: "Navegador web", description, publisher: { "@id": "https://www.zyteron.cl/#organization" } },
      ] }} />
    </>
  );
}
