import Link from "next/link";
import { Container } from "./container";
import { Mail, MapPin, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { siteConfig } from "@/config/site";

const WHATSAPP_URL =
  `${siteConfig.social.whatsapp}?text=Hola%20ZYTERON%2C%20quiero%20cotizar%20una%20soluci%C3%B3n%20para%20mi%20empresa.`;

const COPYRIGHT_YEAR = 2026;

const footerColumns = [
  {
    title: "Servicios Principales",
    items: [
      { label: "Desarrollo web", href: "/desarrollo-web" },
      { label: "Páginas web para pymes", href: "/paginas-web-para-pymes" },
      { label: "Páginas web para empresas", href: "/diseno-web-empresas" },
      { label: "Tiendas online", href: "/tiendas-online" },
      { label: "Sistemas web", href: "/sistemas-web" },
      { label: "Automatización", href: "/automatizacion" },
      { label: "Soporte TI", href: "/soporte-ti" },
    ],
  },
  {
    title: "Soluciones",
    items: [
      { label: "Demos funcionales", href: "/demos" },
      { label: "Productos TI", href: "/productos" },
      { label: "Planes y precios", href: "/planes" },
      { label: "Cotizador", href: "/cotizador" },
      { label: "Casos de éxito", href: "/casos-exito" },
      { label: "Preguntas frecuentes", href: "/faq" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Empresa",
    items: [
      { label: "Quiénes Somos", href: "/quienes-somos" },
      { label: "Contacto", href: "/contacto" },
      { label: "Política de privacidad", href: "/privacidad" },
      { label: "Términos y condiciones", href: "/terminos" },
    ],
  },
];

const footerResources = [
  { label: "Blog para empresas", href: "/blog" },
  { label: "Casos de éxito", href: "/casos-exito" },
  { label: "Planes y precios", href: "/planes" },
];

export function SiteFooter() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="border-b border-blue-900/50 bg-gradient-to-r from-blue-900 to-blue-800">
        <Container className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-base font-bold text-white">Cotización formal para tu negocio</p>
            <p className="text-sm text-blue-200">
              Atención a empresas, pymes y emprendedores en Chile.
            </p>
          </div>
          <Link
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#25d366] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#20b858] hover:shadow-lg hover:shadow-[#25d366]/30"
          >
            <WhatsAppIcon className="h-5 w-5 text-white" />
            Hablar por WhatsApp
          </Link>
        </Container>
      </div>

      <Container className="grid gap-10 py-12 md:grid-cols-[1.35fr_1fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-lg font-extrabold text-white">
              Z
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">ZYTERON</p>
              <p className="text-[10px] uppercase tracking-widest text-blue-300">Web · Sistemas · Soporte TI</p>
            </div>
          </Link>

          <p className="max-w-xs text-sm leading-relaxed text-slate-300">
            ZYTERON - Soluciones web, soporte TI y sistemas digitales para empresas y pymes en Chile.
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-slate-400">
            Atendemos empresas, pymes y emprendedores en Santiago y otras regiones de Chile mediante atención remota.
          </p>

          <div className="space-y-2.5 text-sm">
            <div className="space-y-1">
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-[#4ade80] transition-opacity hover:opacity-80"
              >
                <WhatsAppIcon className="h-4 w-4" />
                WhatsApp: {siteConfig.contact.phoneDisplay}
              </a>
              <a
                href={`tel:${siteConfig.contact.phone}`}
                className="flex items-center gap-2 text-slate-300 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4" />
                Llamadas: {siteConfig.contact.phoneDisplay}
              </a>
            </div>
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="flex items-center gap-2 text-slate-300 transition-colors hover:text-white"
            >
              <Mail className="h-4 w-4" />
              {siteConfig.contact.email}
            </a>
            <div className="flex items-center gap-2 text-slate-300">
              <MapPin className="h-4 w-4" />
              {siteConfig.address.display}
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Phone className="h-4 w-4" />
              Atención comercial: {siteConfig.business.hoursDisplay}
            </div>

          </div>
        </div>

        {footerColumns.map((column) => (
          <div key={column.title} className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">{column.title}</p>
            <ul className="space-y-3 text-sm">
              {column.items.map((item) => (
                <li key={item.href + item.label}>
                  <Link href={item.href} className="text-slate-400 transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-300">Recursos</p>
          <ul className="space-y-3 text-sm">
            {footerResources.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-slate-400 transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="border-y border-white/[0.07] bg-slate-900/60">
        <Container className="flex flex-col gap-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">Identidad comercial</p>
            <div className="grid gap-2 text-xs text-slate-300 md:grid-cols-2">
              <p>Nombre comercial: ZYTERON</p>
              <p>Razón social: ZYTERON SpA</p>
              <p>RUT: 78.398.774-0</p>
              <p>Giro: Servicios informáticos, desarrollo web, soporte TI y soluciones digitales</p>
              <p>Ubicación: {siteConfig.address.display}</p>
              <p>Atención: Empresas, pymes y emprendedores</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Síguenos</p>
            <div className="flex gap-4">
              <a
                href={siteConfig.social.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-full bg-white/5 p-2 text-slate-400 transition-all hover:bg-[#0a66c2] hover:text-white"
                aria-label="LinkedIn"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
              <a
                href={siteConfig.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center rounded-full bg-white/5 p-2 text-slate-400 transition-all hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888] hover:text-white"
                aria-label="Instagram"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
            </div>
          </div>
        </Container>
      </div>

      <div className="border-t border-white/[0.07]">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-slate-500">
          <p>© {COPYRIGHT_YEAR} ZYTERON.CL. Todos los derechos reservados.</p>
          <div className="flex gap-5">
            <Link href={siteConfig.url} className="transition-colors hover:text-slate-300">
              Desarrollado por Zyteron
            </Link>
            <Link href="/privacidad" className="transition-colors hover:text-slate-300">
              Privacidad
            </Link>
            <Link href="/terminos" className="transition-colors hover:text-slate-300">
              Términos
            </Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}
