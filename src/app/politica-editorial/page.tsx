import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Política editorial y criterios de contenido",
  description:
    "Conoce cómo Zyteron crea, revisa, actualiza y corrige sus contenidos sobre desarrollo web, sistemas, tecnología y precios en Chile.",
  path: "/politica-editorial",
});

const criteria = [
  {
    title: "Autoría y responsabilidad",
    body: `Los contenidos institucionales y técnicos son publicados bajo la responsabilidad de ${siteConfig.legalName}. Cuando una pieza tenga un autor específico, su nombre se indicará en la propia publicación.`,
  },
  {
    title: "Fuentes y experiencia",
    body: "Priorizamos documentación oficial, fuentes primarias, datos del proyecto y experiencia de implementación. Distinguimos ejemplos, estimaciones y resultados documentados para no presentarlos como equivalentes.",
  },
  {
    title: "Precios y alcance",
    body: "Los valores publicados son referenciales y se muestran con su moneda e impuestos cuando corresponde. El alcance, plazo y precio definitivo se confirman en una cotización formal antes de comenzar.",
  },
  {
    title: "Actualizaciones",
    body: "Revisamos el contenido cuando cambian nuestros servicios, precios, procesos o una fuente relevante. Las páginas editoriales pueden mostrar su fecha de publicación o última actualización.",
  },
  {
    title: "Correcciones",
    body: "Si detectamos un error factual, una cifra desactualizada o un enlace roto, lo corregimos procurando conservar la intención y la URL original. Las observaciones pueden enviarse por nuestros canales oficiales.",
  },
  {
    title: "Independencia y transparencia",
    body: "El contenido explica servicios ofrecidos por Zyteron y puede tener una finalidad comercial. Evitamos promesas de posicionamiento garantizado, testimonios inventados y métricas sin contexto verificable.",
  },
] as const;

export default function PoliticaEditorialPage() {
  return (
    <main className="bg-white py-16 sm:py-20">
      <JsonLd
        id="politica-editorial-schema"
        data={buildWebPageJsonLd({
          path: "/politica-editorial",
          title: "Política editorial y criterios de contenido",
          description:
            "Criterios de autoría, revisión, actualización y corrección de contenidos de Zyteron.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Política editorial", path: "/politica-editorial" },
          ],
        })}
      />
      <Container className="max-w-4xl">
        <div className="space-y-4 border-b border-slate-200 pb-8">
          <p className="text-sm font-bold tracking-widest text-blue-700 uppercase">
            Transparencia editorial
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Política editorial y criterios de contenido
          </h1>
          <p className="text-base leading-7 text-slate-600">
            Esta política explica quién responde por la información publicada en zyteron.cl y cómo
            procuramos que sea útil, clara y comprobable.
          </p>
          <p className="text-sm text-slate-500">
            Última actualización: <time dateTime="2026-09-23">23 de septiembre de 2026</time>.
          </p>
        </div>

        <div className="mt-10 space-y-8">
          {criteria.map((item) => (
            <section key={item.title}>
              <h2 className="text-xl font-extrabold text-slate-950">{item.title}</h2>
              <p className="mt-2 leading-7 text-slate-600">{item.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="text-xl font-extrabold text-slate-950">Reportar una corrección</h2>
          <p className="mt-2 leading-7 text-slate-700">
            Indica la URL y el dato que deberíamos revisar escribiendo a{" "}
            <a
              className="font-semibold text-blue-800 underline"
              href={`mailto:${siteConfig.contact.email}`}
            >
              {siteConfig.contact.email}
            </a>
            . También puedes conocer la entidad responsable en{" "}
            <Link className="font-semibold text-blue-800 underline" href="/quienes-somos">
              Quiénes somos
            </Link>
            .
          </p>
        </section>
      </Container>
    </main>
  );
}
