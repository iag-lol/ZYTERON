import Link from "next/link";
import { Container } from "./container";
import { Mail, MapPin } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

const footerLinks = [
  {
    title: "Servicios",
    items: [
      { label: "Paginas web para empresas", href: "/servicios/paginas-web-para-empresas" },
      { label: "Diseno web Chile", href: "/servicios/diseno-web-chile" },
      { label: "Desarrollo web Chile", href: "/servicios/desarrollo-web-chile" },
      { label: "Landing pages para empresas", href: "/servicios/landing-pages-para-empresas" },
      { label: "SEO para empresas Chile", href: "/servicios/seo-para-empresas-chile" },
    ],
  },
  {
    title: "Recursos",
    items: [
      { label: "Casos de exito", href: "/casos-exito" },
      { label: "Blog comercial", href: "/blog" },
      { label: "Preguntas frecuentes", href: "/faq" },
      { label: "Páginas por ciudad", href: "/ciudades" },
    ],
  },
  {
    title: "Empresa",
    items: [
      { label: "Nosotros", href: "/nosotros" },
      { label: "Planes y precios", href: "/planes" },
      { label: "Cotizador", href: "/paquetes" },
      { label: "Productos TI", href: "/productos" },
      { label: "Contacto", href: "/contacto" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-slate-900 text-white">
      {/* Top CTA band */}
      <div className="bg-gradient-to-r from-blue-800 to-blue-900 border-b border-blue-700/50">
        <Container className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-base font-bold text-white">¿Listo para llevar tu empresa al siguiente nivel?</p>
            <p className="text-sm text-blue-200">Habla con nosotros hoy — respuesta en menos de 24h.</p>
          </div>
          <Link
            href="https://wa.me/56984752936?text=Hola%20Zyteron%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20sus%20servicios"
            target="_blank"
            rel="noopener noreferrer"
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#25d366] px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-[#20b858] hover:shadow-lg hover:shadow-[#25d366]/30"
          >
            <WhatsAppIcon className="h-5 w-5 text-white" />
            Escribir por WhatsApp
          </Link>
        </Container>
      </div>

      {/* Main footer */}
      <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        {/* Brand */}
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 font-extrabold text-white text-lg border border-white/10">
              Z
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">Zyteron</p>
              <p className="text-[10px] text-blue-300 tracking-widest uppercase">Web · SEO · TI</p>
            </div>
          </Link>
          <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
            Plataforma empresarial de soluciones web, SEO técnico y tecnología para empresas que quieren crecer en Chile.
          </p>
          <div className="space-y-2.5 text-sm">
            <a
              href="https://wa.me/56984752936"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[#4ade80] transition-opacity hover:opacity-80"
            >
              <WhatsAppIcon className="h-4 w-4" />
              +56 9 8475 2936
            </a>
            <a href="mailto:contacto@zyteron.cl" className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white">
              <Mail className="h-4 w-4" />
              contacto@zyteron.cl
            </a>
            <div className="flex items-start gap-2 text-slate-400">
              <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Santiago, Chile</span>
            </div>
          </div>
        </div>

        {footerLinks.map((column) => (
          <div key={column.title} className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-300">{column.title}</p>
            <ul className="space-y-3 text-sm">
              {column.items.map((item) => (
                <li key={item.href + item.label}>
                  <Link href={item.href} className="text-slate-500 transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      {/* Bottom bar */}
      <div className="border-t border-white/[0.07]">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-4 text-xs text-slate-600">
          <p>© {new Date().getFullYear()} Zyteron.cl — Todos los derechos reservados.</p>
          <div className="flex gap-5">
            <Link href="/privacidad" className="transition-colors hover:text-slate-400">Privacidad</Link>
            <Link href="/terminos" className="transition-colors hover:text-slate-400">Términos</Link>
          </div>
        </Container>
      </div>
    </footer>
  );
}
