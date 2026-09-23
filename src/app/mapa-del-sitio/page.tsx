import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { systemPages } from "@/content/system-pages";
import { verticalPages } from "@/content/vertical-pages";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Mapa del sitio",
  description:
    "Explora las páginas, servicios, recursos y canales de contacto publicados por Zyteron para empresas y pymes en Chile.",
  path: "/mapa-del-sitio",
});

const siteSections = [
  {
    title: "Empresa y contacto",
    links: [
      ["Inicio", "/"],
      ["Quiénes somos", "/quienes-somos"],
      ["Casos de éxito", "/casos-exito"],
      ["Contacto", "/contacto"],
      ["Preguntas frecuentes", "/faq"],
      ["Planes y precios", "/planes"],
      ["Cotizador", "/cotizador"],
    ],
  },
  {
    title: "Páginas web y comercio digital",
    links: [
      ["Desarrollo web", "/desarrollo-web"],
      ["Páginas web en Santiago", "/paginas-web-santiago"],
      ["Desarrollo web a medida en Santiago", "/desarrollo-web-santiago"],
      ["Páginas web para empresas", "/paginas-web-para-empresas"],
      ["Páginas web para pymes", "/paginas-web-para-pymes"],
      ["Tiendas online", "/tiendas-online"],
      ["Landing pages para empresas", "/servicios/landing-pages-para-empresas"],
      ["Calculadora de precio web", "/calculadora-precio-pagina-web"],
      ["Cotizador web con PDF", "/cotizador-web-pdf"],
      ...verticalPages.map(
        ({ navLabel, path }) => [`Páginas web para ${navLabel.toLowerCase()}`, path] as const,
      ),
    ],
  },
  {
    title: "Sistemas y soporte",
    links: [
      ["Sistemas web a medida", "/sistemas-web"],
      ...systemPages.map(({ navLabel, path }) => [navLabel, path] as const),
      ["Automatización de procesos", "/automatizacion"],
      ["Automatización de WhatsApp", "/automatizacion-whatsapp-empresas"],
      ["Soporte TI", "/soporte-ti"],
      ["Soporte TI para pymes en Santiago", "/soporte-ti-pymes-santiago"],
      ["Mantención web", "/servicios/mantencion-web-chile"],
      ["Todos los servicios", "/servicios"],
    ],
  },
  {
    title: "SEO, guías y recursos",
    links: [
      ["SEO para empresas", "/servicios/seo-para-empresas-chile"],
      ["Blog", "/blog"],
      ["Recursos y guías", "/recursos"],
      ["Checklist SEO para pymes", "/recursos/checklist-seo-pymes-chile"],
      [
        "Cómo elegir una empresa de desarrollo web",
        "/recursos/como-elegir-empresa-desarrollo-web-chile",
      ],
      ["WordPress vs. desarrollo a medida", "/recursos/wordpress-vs-web-a-medida-chile"],
      ["Política editorial", "/politica-editorial"],
    ],
  },
  {
    title: "Información legal y programas",
    links: [
      ["Política de privacidad", "/privacidad"],
      ["Términos y condiciones", "/terminos"],
      ["Becas web para pymes", "/becas-web-pyme"],
      ["Vitrina de postulantes", "/becas-web-pyme/vitrina"],
    ],
  },
] as const;

export default function MapaDelSitioPage() {
  return (
    <main className="bg-white py-16 sm:py-20">
      <JsonLd
        id="mapa-del-sitio-schema"
        data={buildWebPageJsonLd({
          path: "/mapa-del-sitio",
          title: "Mapa del sitio",
          description: "Directorio de páginas públicas de Zyteron.",
          pageType: "CollectionPage",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Mapa del sitio", path: "/mapa-del-sitio" },
          ],
        })}
      />
      <Container className="max-w-6xl">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm font-bold tracking-widest text-blue-700 uppercase">
            Directorio público
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
            Mapa del sitio
          </h1>
          <p className="text-base leading-7 text-slate-600">
            Encuentra rápidamente nuestros servicios, recursos, información corporativa y páginas de
            contacto.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {siteSections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6"
            >
              <h2 className="text-lg font-extrabold text-slate-950">{section.title}</h2>
              <ul className="mt-4 space-y-3">
                {section.links.map(([label, href]) => (
                  <li key={href}>
                    <Link
                      className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                      href={href}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Container>
    </main>
  );
}
