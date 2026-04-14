import Link from "next/link";
import { Container } from "./container";
import { Mail, MapPin } from "lucide-react";

const footerLinks = [
  {
    title: "Servicios",
    items: [
      { label: "Desarrollo web", href: "/servicios" },
      { label: "SEO avanzado", href: "/servicios" },
      { label: "Ecommerce", href: "/servicios" },
      { label: "Soporte TI", href: "/servicios" },
    ],
  },
  {
    title: "Productos",
    items: [
      { label: "Notebooks", href: "/productos" },
      { label: "PC de escritorio", href: "/productos" },
      { label: "Combos empresariales", href: "/productos" },
    ],
  },
  {
    title: "Empresa",
    items: [
      { label: "Nosotros", href: "/nosotros" },
      { label: "Planes y precios", href: "/planes" },
      { label: "Cotizador", href: "/paquetes" },
      { label: "Contacto", href: "/contacto" },
    ],
  },
];

const WspIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="h-5 w-5" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
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
              <WspIcon />
              +56 9 8475 2936
            </a>
            <a href="mailto:eduardo.avila@zyteron.cly" className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white">
              <Mail className="h-4 w-4" />
              eduardo.avila@zyteron.cly
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
