import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { IntegrationCatalog } from "@/components/home/integration-catalog";
import { HomeIntegrationDirectory } from "@/components/home/home-ecosystem";
import { JsonLd } from "@/components/seo/json-ld";
import { integrationPlatformCount, integrationPlatforms } from "@/content/integration-catalog";
import { siteConfig } from "@/config/site";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Integraciones de Sistemas y API en Chile",
  description:
    "Integraciones a medida con SII, firmas electrónicas, Meta, Mercado Libre, Webpay, ERP, CRM y herramientas de automatización. Revisa plataformas, usos y requisitos.",
  path: "/integraciones",
});

const steps = [
  [
    "01",
    "Definir el proceso",
    "Qué información debe viajar, desde dónde, hacia qué plataforma y quién necesita utilizarla.",
  ],
  [
    "02",
    "Validar los accesos",
    "APIs disponibles, permisos, módulos, contratos y límites. Los servicios públicos tienen requisitos de habilitación propios.",
  ],
  [
    "03",
    "Construir y probar",
    "Pruebas con datos controlados, revisión de estados y tratamiento de errores, duplicados y reintentos.",
  ],
  [
    "04",
    "Entregar y acompañar",
    "Alcance documentado, responsables, monitoreo y condiciones de soporte y continuidad definidas en la propuesta.",
  ],
];

export default function IntegrationsPage() {
  return (
    <main className="home-page overflow-x-clip">
      <JsonLd
        id="integrations-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/integraciones",
          title: "Integraciones de Sistemas y API en Chile | Zyteron",
          description:
            "Catálogo de plataformas para conectar pagos, facturación, firma, ventas, personas y operaciones mediante integraciones a medida.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Integraciones", path: "/integraciones" },
          ],
        })}
      />
      <JsonLd
        id="integrations-catalog-schema"
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "@id": `${siteConfig.url}/integraciones#catalogo`,
          name: "Plataformas y servicios para evaluar integraciones en Chile",
          description:
            "Opciones de integración sujetas a evaluación técnica, licencias y acceso autorizado. Las marcas no representan alianzas ni conectores ya implementados.",
          numberOfItems: integrationPlatformCount,
          itemListElement: integrationPlatforms.map((platform, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: platform.name,
            description: platform.use,
            url: `${siteConfig.url}/integraciones#plataforma-${platform.id}`,
          })),
        }}
      />
      <section className="home-section">
        <Container>
          <p className="eyebrow">Software conectado con tu operación</p>
          <h1 className="mt-6 max-w-4xl text-[clamp(38px,5vw,68px)]">
            Integraciones de sistemas y API en Chile
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
            Conecta tu web y tus sistemas con las herramientas que ya utiliza tu empresa: pagos, SII
            y facturación, firmas electrónicas, Meta, Mercado Libre, ERP, CRM y gestión de personas.
            Cada conexión se diseña alrededor de un proceso y un acceso autorizado.
          </p>
          <div className="mt-7 flex flex-wrap gap-x-7 gap-y-3">
            <Link
              href="/contacto?tipo=automatizacion&origen=catalogo-integraciones"
              className="design-button"
            >
              Evaluar mi integración <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <a href="#directorio-integraciones" className="text-link">
              Consultar todos los nombres <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
          <div className="home-section-head mt-20">
            <div>
              <p className="eyebrow">{integrationPlatformCount} plataformas y servicios</p>
              <h2>
                Encuentra tu herramienta.
                <br />
                Explora lo que puedes conectar.
              </h2>
              <p>
                Voltea cada tarjeta para revisar usos, condiciones de acceso y su fuente oficial.
                También puedes buscar por nombre o filtrar por área.
              </p>
            </div>
          </div>
          <IntegrationCatalog initialLimit={16} />
          <p className="mt-6 max-w-4xl text-xs leading-6 text-slate-600">
            Este catálogo presenta posibilidades de desarrollo, sujetas a evaluación técnica y
            disponibilidad de cada proveedor. Las marcas pertenecen a sus titulares y no implican
            clientes, alianzas, certificaciones ni integraciones ya activas. Licencias, comisiones e
            infraestructura se contratan según el alcance acordado.
          </p>
        </Container>
      </section>
      <HomeIntegrationDirectory />
      <section className="home-section">
        <Container>
          <div className="home-section-head">
            <div>
              <p className="eyebrow">Del sistema al proceso real</p>
              <h2>Una integración se comprueba de principio a fin.</h2>
              <p>
                Una venta puede relacionarse con el cobro, un documento tributario y un despacho.
                Una solicitud puede activar una aprobación y una firma. La propuesta define los
                pasos concretos y cómo se validará cada resultado.
              </p>
            </div>
          </div>
          <ol className="process-steps">
            {steps.map(([number, title, description]) => (
              <li key={number}>
                <span className="process-num">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4">
            <Link href="/automatizacion" className="text-link">
              Explorar automatización empresarial <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/sistemas-web" className="text-link">
              Sistemas web a medida <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link
              href="/contacto?tipo=automatizacion&origen=catalogo-integraciones"
              className="design-button"
            >
              Definir el alcance de mi proyecto <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>
    </main>
  );
}
