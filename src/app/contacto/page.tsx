import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { ContactLeadForm } from "@/components/forms/contact-lead-form";
import { Mail, MapPin, Clock, FileText } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { buildContactPageJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Contacto | Cotiza tu Página Web o Sistema Digital",
  description:
    "Contáctanos para cotizar páginas web, tiendas online, sistemas internos, automatizaciones y soluciones digitales para tu empresa.",
  path: "/contacto",
});

const WHATSAPP_URL =
  "https://wa.me/56984752936?text=Hola%20ZYTERON%2C%20quiero%20solicitar%20una%20cotizaci%C3%B3n%20formal.";

const contactInfo = [
  {
    icon: <WhatsAppIcon className="h-5 w-5" />,
    label: "Teléfono / WhatsApp",
    value: "+56 9 8475 2936",
    sub: "Canal recomendado para contacto rápido",
    href: WHATSAPP_URL,
    classes: "border-[#25d366]/30 bg-[#25d366]/5 hover:bg-[#25d366]/10",
    iconClasses: "bg-[#25d366]/10 text-[#18a34d]",
    external: true,
  },
  {
    icon: <Mail className="h-5 w-5" />,
    label: "Correo",
    value: "eduardo.avila@zyteron.cl",
    sub: "Atención comercial y coordinación",
    href: "mailto:eduardo.avila@zyteron.cl",
    classes: "border-blue-200 bg-blue-50 hover:bg-blue-100/70",
    iconClasses: "bg-blue-100 text-blue-700",
    external: false,
  },
  {
    icon: <MapPin className="h-5 w-5" />,
    label: "Ubicación",
    value: "Santiago, Chile",
    sub: "Atención a todo Chile",
    href: null,
    classes: "border-violet-200 bg-violet-50",
    iconClasses: "bg-violet-100 text-violet-700",
    external: false,
  },
  {
    icon: <Clock className="h-5 w-5" />,
    label: "Horario comercial",
    value: "Lun-Vie 09:00-18:00",
    sub: "Respuesta dentro de horario laboral",
    href: null,
    classes: "border-amber-200 bg-amber-50",
    iconClasses: "bg-amber-100 text-amber-700",
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
          title: "Contacto | Cotiza tu Página Web o Sistema Digital",
          description: "Página de contacto comercial para solicitar cotización formal.",
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
          "Página de contacto para solicitudes de cotización de empresas, pymes y emprendedores en Chile.",
        )}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Contacto comercial
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Cotiza tu página web, sistema digital o solución tecnológica
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            Cuéntanos qué necesita tu empresa. Revisaremos alcance, prioridades y requerimientos para entregarte
            una orientación clara y una propuesta profesional según el tipo de proyecto.
          </p>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-7">
            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900">Canales de contacto</h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Elige el canal que prefieras. Si tu solicitud es urgente, recomendamos WhatsApp.
              </p>
              <p className="text-sm leading-relaxed text-slate-600">
                Atendemos empresas, pymes y emprendedores en Santiago y otras regiones de Chile mediante atención remota.
              </p>
              <p className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-relaxed text-slate-700">
                Responderemos con una orientación clara según el tipo de proyecto y necesidad de tu negocio.
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
                        <p className="mb-0.5 text-xs text-slate-500">{c.label}</p>
                        <p className="text-sm font-bold text-slate-900">{c.value}</p>
                        <p className="text-xs text-slate-400">{c.sub}</p>
                      </div>
                    </a>
                  ) : (
                    <div className={`flex items-center gap-4 rounded-xl border p-4 ${c.classes}`}>
                      <div className={`shrink-0 rounded-lg p-2 ${c.iconClasses}`}>{c.icon}</div>
                      <div>
                        <p className="mb-0.5 text-xs text-slate-500">{c.label}</p>
                        <p className="text-sm font-bold text-slate-900">{c.value}</p>
                        <p className="text-xs text-slate-400">{c.sub}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText className="h-4 w-4 text-blue-700" />
                Antes de iniciar
              </p>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p>Cotización formal según requerimiento.</p>
                <p>Definición de alcance y condiciones por escrito.</p>
                <p>Atención a empresas, pymes y emprendedores.</p>
              </div>
            </div>
          </div>

          <ContactLeadForm />
        </Container>
      </section>
    </main>
  );
}
