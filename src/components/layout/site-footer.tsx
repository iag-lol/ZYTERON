import Link from "next/link";
import { Container } from "./container";
import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "@/config/site";

const WHATSAPP_URL = `${siteConfig.social.whatsapp}?text=Hola%20Zyteron%2C%20quiero%20conversar%20sobre%20un%20proyecto%20digital.`;

const COPYRIGHT_YEAR = 2026;

const footerColumns = [
  {
    title: "Páginas web",
    items: [
      { label: "Páginas web Santiago", href: "/paginas-web-santiago" },
      { label: "Desarrollo web Santiago", href: "/desarrollo-web-santiago" },
      { label: "Páginas web para empresas", href: "/paginas-web-para-empresas" },
      { label: "Páginas web para pymes", href: "/paginas-web-para-pymes" },
      { label: "Desarrollo web", href: "/desarrollo-web" },
      { label: "Tiendas online", href: "/tiendas-online" },
      { label: "Landing pages", href: "/servicios/landing-pages-para-empresas" },
      { label: "Calculadora de precio", href: "/calculadora-precio-pagina-web" },
      { label: "Cotizar y comprar online", href: "/cotizador/manual" },
      { label: "Cotización a medida", href: "/cotizador" },
    ],
  },
  {
    title: "Soluciones",
    items: [
      { label: "Sistemas web a medida", href: "/sistemas-web" },
      { label: "Personas y RRHH", href: "/sistemas-web/gestion-personas" },
      { label: "Control de flota", href: "/sistemas-web/control-flota" },
      { label: "Intranets y portales", href: "/sistemas-web/intranet-corporativa" },
      { label: "Catálogos digitales", href: "/catalogos-digitales" },
      { label: "SEO para empresas", href: "/servicios/seo-para-empresas-chile" },
      { label: "Mantención de sitios web", href: "/servicios/mantencion-web-chile" },
      { label: "Automatización", href: "/automatizacion" },
      { label: "Soporte TI", href: "/soporte-ti" },
      { label: "Planes y precios", href: "/planes" },
      { label: "Todos los servicios", href: "/servicios" },
    ],
  },
  {
    title: "Empresa",
    items: [
      { label: "Denurvia: investigaciones internas", href: "/soluciones/denurvia" },
      { label: "Nosotros", href: "/quienes-somos" },
      { label: "Casos de éxito", href: "/casos-exito" },
      { label: "Demos de páginas web", href: "/demos" },
      { label: "Becas web para pymes", href: "/becas-web-pyme" },
      { label: "Recursos y guías", href: "/recursos" },
      { label: "Blog", href: "/blog" },
      { label: "Política editorial", href: "/politica-editorial" },
      { label: "Mapa del sitio", href: "/mapa-del-sitio" },
      { label: "Preguntas frecuentes", href: "/faq" },
      { label: "Contacto", href: "/contacto" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-invitation">
          <div>
            <p className="eyebrow">El próximo proyecto puede ser el tuyo.</p>
            <h2>Hagamos que funcione.</h2>
          </div>
          <Link href="/contacto" className="footer-arrow" aria-label="Conversar sobre un proyecto">
            <ArrowUpRight size={40} />
          </Link>
        </div>
        <div className="footer-grid">
          <div className="footer-business">
            <Link href="/" className="brand-name">
              zyteron
            </Link>
            <p>
              Software y soluciones digitales
              <br />
              para empresas y profesionales.
            </p>
            <a href={`mailto:${siteConfig.contact.email}`}>{siteConfig.contact.email}</a>
            <a href={`tel:${siteConfig.contact.phone}`}>{siteConfig.contact.phoneDisplay}</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="text-link">
              WhatsApp <ArrowUpRight size={14} />
            </a>
            <p className="footer-address">
              {siteConfig.address.display}
              <br />
              Reuniones con coordinación previa.
              <br />
              {siteConfig.business.hoursDisplay}
            </p>
          </div>
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3>{column.title}</h3>
              <ul>
                {column.items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="footer-legal">
          <div>
            <p>
              © {COPYRIGHT_YEAR} {siteConfig.legalName} · RUT {siteConfig.taxId}
            </p>
            <p>Servicios informáticos, desarrollo web y soluciones digitales. Santiago, Chile.</p>
          </div>
          <div className="footer-legal-links">
            <Link href="/privacidad">Privacidad</Link>
            <Link href="/terminos">Términos</Link>
            {(["linkedin", "instagram", "facebook"] as const).map((network) => (
              <a
                key={network}
                href={siteConfig.social[network]}
                target="_blank"
                rel="noopener noreferrer"
              >
                {network.charAt(0).toUpperCase() + network.slice(1)}
              </a>
            ))}
          </div>
        </div>
      </Container>
    </footer>
  );
}
