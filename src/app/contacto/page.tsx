import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, MapPin, Clock, ArrowRight, MessageSquare } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Contacto Agencia Diseno Web Chile | Zyteron",
  description:
    "Contacta a Zyteron para diseno web Chile, desarrollo web Chile y creacion de sitios web para empresas. Respuesta en menos de 24 horas.",
  path: "/contacto",
  keywords: ["contacto diseno web chile", "cotizar desarrollo web chile", "agencia web santiago contacto"],
});

const WspIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const contactInfo = [
  {
    icon: <WspIcon />,
    label: "WhatsApp directo",
    value: "+56 9 8475 2936",
    sub: "Respuesta inmediata",
    href: "https://wa.me/56984752936?text=Hola%20Zyteron%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20sus%20servicios",
    classes: "border-[#25d366]/30 bg-[#25d366]/5 hover:bg-[#25d366]/10",
    iconClasses: "bg-[#25d366]/10 text-[#18a34d]",
    labelColor: "text-slate-500",
    valueColor: "text-slate-900",
    external: true,
  },
  {
    icon: <Mail className="h-5 w-5" />,
    label: "Correo electrónico",
    value: "contacto@zyteron.cl",
    sub: "Respondemos en 24h",
    href: "mailto:contacto@zyteron.cl",
    classes: "border-blue-200 bg-blue-50 hover:bg-blue-100/70",
    iconClasses: "bg-blue-100 text-blue-700",
    labelColor: "text-slate-500",
    valueColor: "text-slate-900",
    external: false,
  },
  {
    icon: <MapPin className="h-5 w-5" />,
    label: "Ubicación",
    value: "Santiago, Chile",
    sub: "Soporte remoto a todo Chile",
    href: null,
    classes: "border-violet-200 bg-violet-50",
    iconClasses: "bg-violet-100 text-violet-700",
    labelColor: "text-slate-500",
    valueColor: "text-slate-900",
    external: false,
  },
  {
    icon: <Clock className="h-5 w-5" />,
    label: "Horario de atención",
    value: "Lun–Vie 9:00–18:00",
    sub: "WhatsApp disponible 24/7",
    href: null,
    classes: "border-amber-200 bg-amber-50",
    iconClasses: "bg-amber-100 text-amber-700",
    labelColor: "text-slate-500",
    valueColor: "text-slate-900",
    external: false,
  },
];

export default function ContactoPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="contacto-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/contacto",
          title: "Contacto Agencia Diseno Web Chile | Zyteron",
          description:
            "Pagina de contacto para cotizar diseno web, desarrollo web y SEO tecnico para empresas en Chile.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Contacto", path: "/contacto" },
          ],
        })}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-pattern border-b border-slate-200 py-20">
        <Container className="relative z-10 space-y-5 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Contacto
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Hablemos de tu{" "}
            <span className="text-gradient-blue">proyecto</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-slate-600">
            Déjanos tus datos y un ejecutivo especializado te contactará en menos de 24h hábiles con la propuesta correcta.
          </p>
        </Container>
      </section>

      {/* Main content */}
      <section className="py-16 section-alt">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">

          {/* Left — Info */}
          <div className="space-y-7">
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900">Múltiples canales de atención</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Elige el canal que prefieras. Preferimos WhatsApp para respuestas inmediatas.
              </p>
            </div>

            <div className="space-y-3">
              {contactInfo.map((c) => (
                <div key={c.label}>
                  {c.href ? (
                    <a
                      href={c.href}
                      target={c.external ? "_blank" : undefined}
                      rel={c.external ? "noopener noreferrer" : undefined}
                      className={`flex items-center gap-4 rounded-xl border p-4 transition-all ${c.classes}`}
                    >
                      <div className={`shrink-0 rounded-lg p-2 ${c.iconClasses}`}>{c.icon}</div>
                      <div>
                        <p className={`text-xs mb-0.5 ${c.labelColor}`}>{c.label}</p>
                        <p className={`text-sm font-bold ${c.valueColor}`}>{c.value}</p>
                        <p className="text-xs text-slate-400">{c.sub}</p>
                      </div>
                    </a>
                  ) : (
                    <div className={`flex items-center gap-4 rounded-xl border p-4 ${c.classes}`}>
                      <div className={`shrink-0 rounded-lg p-2 ${c.iconClasses}`}>{c.icon}</div>
                      <div>
                        <p className={`text-xs mb-0.5 ${c.labelColor}`}>{c.label}</p>
                        <p className={`text-sm font-bold ${c.valueColor}`}>{c.value}</p>
                        <p className="text-xs text-slate-400">{c.sub}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* WhatsApp highlight */}
            <div className="rounded-2xl border border-[#25d366]/30 bg-[#25d366]/5 p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25d366]/15 text-[#18a34d]">
                  <WspIcon />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">¿Prefieres chatear?</p>
                  <p className="text-xs text-slate-500">Respuesta en minutos vía WhatsApp</p>
                </div>
              </div>
              <a
                href="https://wa.me/56984752936?text=Hola%20Zyteron%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20sus%20servicios"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#25d366] px-4 py-3 text-sm font-bold text-white transition-all hover:bg-[#20b858] wsp-pulse"
              >
                <WspIcon />
                Escribir por WhatsApp ahora
              </a>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Qué esperar</p>
              {[
                "Respuesta en menos de 24h hábiles",
                "Propuesta personalizada sin costo",
                "Sin presión de venta ni spam",
                "Ejecutivo especializado en tu industria",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-100/80">
            <div className="mb-6 space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-700" />
                <h2 className="text-lg font-bold text-slate-900">Envíanos tu consulta</h2>
              </div>
              <p className="text-xs text-slate-500">Completa el formulario y te contactamos a la brevedad.</p>
            </div>

            <form className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre y apellido</Label>
                  <Input id="name" placeholder="Tu nombre" required className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Email empresarial</Label>
                  <Input id="email" type="email" placeholder="correo@empresa.cl" required className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-bold text-slate-500 uppercase tracking-wide">WhatsApp / Teléfono</Label>
                  <Input id="phone" placeholder="+56 9 xxxx xxxx" className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Empresa</Label>
                  <Input id="company" placeholder="Nombre de tu empresa" className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="service" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Servicio de interés</Label>
                <Input id="service" placeholder="Ej: Sitio corporativo + SEO avanzado" className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cuéntanos tu proyecto</Label>
                <Textarea id="message" rows={4} placeholder="Describe tus objetivos, plazos y presupuesto estimado..." className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white resize-none" />
              </div>
              <Button type="submit" className="w-full gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold btn-primary-glow">
                Enviar solicitud <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-xs text-slate-400">
                Al enviar, aceptas que procesemos tus datos para gestionar la cotización. Sin spam.
              </p>
            </form>
          </div>
        </Container>
      </section>
    </main>
  );
}
