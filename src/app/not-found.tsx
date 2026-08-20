import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Calculator,
  Home,
  MessageCircle,
  MonitorSmartphone,
  Building2,
  Store,
  Tags,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página no encontrada | Zyteron",
  description:
    "La página que buscas no existe o cambió de dirección. Encuentra aquí los servicios, planes y el cotizador de Zyteron.",
  robots: {
    index: false,
    follow: true,
  },
};

const quickLinks = [
  {
    href: "/",
    title: "Inicio",
    desc: "Conoce todo lo que podemos hacer por tu negocio.",
    icon: Home,
  },
  {
    href: "/desarrollo-web",
    title: "Desarrollo web",
    desc: "Páginas web profesionales para captar clientes.",
    icon: MonitorSmartphone,
  },
  {
    href: "/paginas-web-para-pymes",
    title: "Páginas web para pymes",
    desc: "Soluciones pensadas para la realidad de las pymes chilenas.",
    icon: Store,
  },
  {
    href: "/paginas-web-para-empresas",
    title: "Páginas web para empresas",
    desc: "Sitios corporativos que dan confianza y formalidad.",
    icon: Building2,
  },
  {
    href: "/planes",
    title: "Planes y precios",
    desc: "Valores claros y por escrito para cada tipo de proyecto.",
    icon: Tags,
  },
  {
    href: "/cotizador",
    title: "Cotizador online",
    desc: "Estima el valor de tu proyecto en pocos minutos.",
    icon: Calculator,
  },
];

export default function NotFound() {
  return (
    <main className="bg-white">
      <section className="border-b border-slate-200 bg-slate-50 py-20">
        <Container className="space-y-6 text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">Error 404</p>
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Esta página no existe o cambió de dirección
          </h1>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Tranquilo, lo que buscas sigue estando en Zyteron. Estas son las páginas que más ayudan a
            nuestros clientes a partir con su proyecto.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/">Ir al inicio</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            >
              <Link href="/contacto">
                <MessageCircle className="mr-2 h-4 w-4" />
                Hablar con nosotros
              </Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-10">
          <h2 className="text-center text-2xl font-extrabold text-slate-900 sm:text-3xl">
            ¿Qué estabas buscando?
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {quickLinks.map(({ href, title, desc, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-3xl border border-slate-200 bg-white p-8 transition-shadow hover:shadow-lg"
              >
                <div className="mb-5 inline-flex rounded-xl bg-blue-50 p-3 text-blue-700">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <h3 className="mb-2 flex items-center gap-2 text-lg font-extrabold text-slate-900">
                  {title}
                  <ArrowRight className="h-4 w-4 text-blue-600 opacity-0 transition-opacity group-hover:opacity-100" />
                </h3>
                <p className="text-sm leading-relaxed text-slate-600">{desc}</p>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
