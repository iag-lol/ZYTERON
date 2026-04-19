import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { ContactLeadForm } from "@/components/forms/contact-lead-form";
import { Mail, MapPin, Clock } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { buildContactPageJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Contacto Agencia Diseno Web Chile | Zyteron",
  description:
    "Contacta a Zyteron para diseno web Chile, desarrollo web Chile y creacion de sitios web para empresas. Respuesta en menos de 24 horas.",
  path: "/contacto",
  keywords: ["contacto diseno web chile", "cotizar desarrollo web chile", "agencia web santiago contacto"],
});

const contactInfo = [
  {
    icon: <WhatsAppIcon className="h-5 w-5" />,
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
    value: "eduardo.avila@zyteron.cl",
    sub: "Respondemos en 24h",
    href: "mailto:eduardo.avila@zyteron.cl",
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
      <JsonLd
        id="contacto-page-schema"
        data={buildContactPageJsonLd(
          "/contacto",
          "Página de contacto para cotizar diseño web, desarrollo web y SEO para empresas en Chile."
        )}
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
                  <WhatsAppIcon className="h-5 w-5" />
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
                <WhatsAppIcon className="h-5 w-5" />
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
          <ContactLeadForm />
        </Container>
      </section>
    </main>
  );
}
