"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Ban,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  Layers,
  MessageSquareWarning,
  Route,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import {
  catalog,
  companyIdentity,
  conductRules,
  executiveFaq,
  objections,
  planGuidance,
  qualificationChecklist,
  quickLinks,
  salesProcess,
  whatWeDo,
  whatWeDoNot,
} from "@/content/commercial-playbook";
import { AI_CONSUMPTION_NOTE } from "@/config/pricing";
import { DataItem, Panel, Pill, SectionTitle } from "@/components/commercial/ui";
import { cn } from "@/lib/utils";

/**
 * Centro de conocimiento: material de estudio para que el ejecutivo hable con
 * propiedad de Zyteron, cotice dentro del marco correcto y sepa qué no debe
 * comprometer.
 */

const TABS = [
  { id: "empresa", label: "La empresa", icon: Building2 },
  { id: "alcance", label: "Qué hacemos y qué no", icon: Layers },
  { id: "catalogo", label: "Planes y precios", icon: Sparkles },
  { id: "proceso", label: "Proceso comercial", icon: Route },
  { id: "argumentario", label: "Argumentario", icon: MessageSquareWarning },
  { id: "reglas", label: "Reglas y FAQ", icon: ShieldAlert },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CommercialKnowledge() {
  const [tab, setTab] = useState<TabId>("empresa");

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-blue-950 p-6 text-white">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">
          Material de estudio interno
        </p>
        <h1 className="mt-1.5 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
          <BookOpenCheck className="h-6 w-6" /> Centro de conocimiento
        </h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-300">
          Todo lo que necesitas para representar a Zyteron con criterio: qué somos, qué entregamos, qué
          queda fuera, cómo se venden los planes y qué nunca se compromete. Estúdialo antes de tu primera
          reunión y vuelve a él cada vez que aparezca una duda.
        </p>
      </section>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-bold transition-colors",
              tab === item.id ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
            )}
          >
            <item.icon className="h-4 w-4" /> {item.label}
          </button>
        ))}
      </div>

      {tab === "empresa" && <CompanyTab />}
      {tab === "alcance" && <ScopeTab />}
      {tab === "catalogo" && <CatalogTab />}
      {tab === "proceso" && <ProcessTab />}
      {tab === "argumentario" && <PitchTab />}
      {tab === "reglas" && <RulesTab />}
    </div>
  );
}

function CompanyTab() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Panel title="Quiénes somos" description="Lo que debes poder explicar en 30 segundos." icon={<Building2 className="h-4 w-4" />}>
        <p className="text-[13px] leading-6 text-slate-600">{companyIdentity.pitch}</p>
        <div className="mt-4">
          <SectionTitle>Lo que nos diferencia</SectionTitle>
          <ul className="mt-2.5 space-y-2">
            {companyIdentity.differentiators.map((item) => (
              <li key={item} className="flex gap-2.5 text-[12.5px] leading-5 text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Representante</p>
          <p className="mt-1 text-[13px] font-extrabold text-blue-950">
            {companyIdentity.representative.name} · {companyIdentity.representative.role}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-blue-900/80">
            {companyIdentity.representative.description}
          </p>
        </div>
      </Panel>

      <div className="space-y-5">
        <Panel title="Datos de la empresa" description="Úsalos tal cual al identificarte." icon={<ShieldAlert className="h-4 w-4" />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <DataItem label="Razón social" value={companyIdentity.legalName} />
            <DataItem label="RUT" value={companyIdentity.taxId} mono />
            <DataItem label="Experiencia" value={`${companyIdentity.experienceYears} años`} />
            <DataItem label="Cobertura" value={companyIdentity.areaServed} />
            <DataItem label="Horario" value={companyIdentity.hours} />
            <DataItem label="Teléfono" value={companyIdentity.phone} />
            <DataItem label="Correo" value={companyIdentity.email} />
            <DataItem label="Sitio" value={companyIdentity.site.replace("https://", "")} />
          </dl>
        </Panel>

        <Panel title="Enlaces de apoyo" description="Material público para compartir con el cliente." icon={<ExternalLink className="h-4 w-4" />}>
          <ul className="space-y-2">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  target="_blank"
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
                >
                  <span className="min-w-0">
                    <span className="block text-[12.5px] font-bold text-slate-800">{link.label}</span>
                    <span className="block truncate text-[11px] text-slate-500">{link.description}</span>
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function ScopeTab() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Qué hacemos" description="Servicios que sí puedes ofrecer." icon={<CheckCircle2 className="h-4 w-4" />}>
        <div className="space-y-5">
          {whatWeDo.map((section) => (
            <section key={section.title}>
              <SectionTitle>{section.title}</SectionTitle>
              <ul className="mt-2 space-y-1.5">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-[12.5px] leading-5 text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Panel>

      <Panel title="Qué NO hacemos" description="Límites que debes conocer antes de comprometer." icon={<Ban className="h-4 w-4" />}>
        <div className="space-y-5">
          {whatWeDoNot.map((section) => (
            <section key={section.title}>
              <SectionTitle>{section.title}</SectionTitle>
              <ul className="mt-2 space-y-1.5">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-[12.5px] leading-5 text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-[11.5px] leading-5 text-amber-900">
          Decir “eso no lo hacemos, pero puedo proponerte esta alternativa” genera más confianza que
          comprometer algo que después no se cumple.
        </p>
      </Panel>
    </div>
  );
}

function CatalogTab() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-[11.5px] leading-5 text-slate-500 shadow-sm">
        <strong className="text-slate-700">Cómo usar estos valores:</strong> {catalog.note}
      </div>

      <Panel title="Planes" description="Punto de partida de toda conversación." icon={<Sparkles className="h-4 w-4" />} padded={false}>
        <div className="divide-y divide-slate-100">
          {catalog.plans.map((plan) => {
            const guidance = planGuidance.find((item) => plan.name.includes(item.plan) || item.plan.includes(plan.name));
            return (
              <article key={plan.name} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13.5px] font-extrabold text-slate-900">{plan.name}</p>
                  <p className="text-[13px] font-extrabold text-blue-700">
                    {plan.price}
                    {plan.note && <span className="ml-1 text-[11px] font-semibold text-slate-400">({plan.note})</span>}
                  </p>
                </div>
                {guidance && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <p className="text-[11.5px] leading-5 text-slate-500">
                      <strong className="text-slate-600">Para quién:</strong> {guidance.fit}
                    </p>
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] italic leading-5 text-slate-500">
                      {guidance.signal}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Servicios de inteligencia artificial" description="Implementación + mensualidad." icon={<Sparkles className="h-4 w-4" />} padded={false}>
          <div className="divide-y divide-slate-100">
            {catalog.aiServices.map((service) => (
              <article key={service.name} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-[12.5px] font-extrabold text-slate-900">{service.name}</p>
                  {service.tag && <Pill label={service.tag} cls="bg-violet-50 text-violet-700 ring-violet-200" />}
                </div>
                <p className="mt-1 text-[11.5px] leading-5 text-slate-500">{service.description}</p>
                <p className="mt-2 text-[12px] font-bold text-blue-700">
                  {service.setup}
                  {service.monthly && <span className="text-slate-500"> · {service.monthly}</span>}
                </p>
              </article>
            ))}
          </div>
          <p className="border-t border-slate-100 px-5 py-3 text-[11px] leading-5 text-slate-500">
            {AI_CONSUMPTION_NOTE}
          </p>
        </Panel>

        <div className="space-y-5">
          <Panel title="Servicios adicionales" description="Módulos que se suman a cualquier plan." icon={<Wrench className="h-4 w-4" />} padded={false}>
            <ul className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
              {catalog.addons.map((addon) => (
                <li key={addon.name} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="min-w-0 text-[12px] text-slate-600">
                    {addon.name}
                    {addon.note && <span className="block text-[10.5px] text-slate-400">{addon.note}</span>}
                  </span>
                  <span className="shrink-0 text-[12px] font-bold text-slate-800">{addon.price}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Mantención mensual" description="La continuidad que sostiene la relación." icon={<Wrench className="h-4 w-4" />} padded={false}>
            <ul className="divide-y divide-slate-100">
              {catalog.maintenance.map((item) => (
                <li key={item.name} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="text-[12px] text-slate-600">{item.name}</span>
                  <span className="shrink-0 text-[12px] font-bold text-slate-800">{item.price}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function ProcessTab() {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
      <Panel title="Etapas del proceso comercial" description="Quién hace qué en cada momento." icon={<Route className="h-4 w-4" />}>
        <ol className="space-y-4">
          {salesProcess.map((step) => (
            <li key={step.step} className="relative flex gap-3.5 pb-1">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[12px] font-extrabold text-white">
                {step.step}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-extrabold text-slate-900">{step.title}</p>
                  <Pill label={step.owner} cls="bg-slate-100 text-slate-600 ring-slate-200" />
                </div>
                <p className="mt-1 text-[12.5px] leading-5 text-slate-600">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Preguntas de calificación" description="Hazlas siempre en el primer contacto real." icon={<CircleHelp className="h-4 w-4" />}>
        <ol className="space-y-3.5">
          {qualificationChecklist.map((item, index) => (
            <li key={item.question} className="rounded-xl border border-slate-200 p-3.5">
              <p className="text-[12.5px] font-bold text-slate-800">
                {index + 1}. {item.question}
              </p>
              <p className="mt-1 text-[11.5px] leading-5 text-slate-500">{item.why}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

function PitchTab() {
  return (
    <Panel
      title="Objeciones frecuentes"
      description="Qué responder y qué evitar en cada caso."
      icon={<MessageSquareWarning className="h-4 w-4" />}
      padded={false}
    >
      <div className="divide-y divide-slate-100">
        {objections.map((item) => (
          <article key={item.objection} className="px-5 py-4">
            <p className="text-[13px] font-extrabold text-slate-900">{item.objection}</p>
            <div className="mt-2.5 grid gap-2.5 lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Qué responder</p>
                <p className="mt-1 text-[12.5px] leading-5 text-emerald-950">{item.answer}</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Qué evitar</p>
                <p className="mt-1 text-[12.5px] leading-5 text-rose-950">{item.avoid}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function RulesTab() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <div className="space-y-5">
        {conductRules.map((section) => {
          const always = section.title === "Siempre";
          return (
            <Panel
              key={section.title}
              title={section.title}
              description={always ? "Prácticas obligatorias." : "Conductas que ponen en riesgo tu acceso."}
              icon={always ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            >
              <ul className="space-y-2">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-2.5 text-[12.5px] leading-5 text-slate-600">
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        always ? "bg-emerald-500" : "bg-rose-500",
                      )}
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </Panel>
          );
        })}
      </div>

      <Panel title="Preguntas frecuentes del ejecutivo" description="Dudas habituales sobre comisiones y registros." icon={<CircleHelp className="h-4 w-4" />} padded={false}>
        <div className="divide-y divide-slate-100">
          {executiveFaq.map((item) => (
            <details key={item.question} className="group px-5 py-3.5">
              <summary className="cursor-pointer list-none text-[12.5px] font-bold text-slate-800 marker:hidden group-open:text-blue-700">
                {item.question}
              </summary>
              <p className="mt-2 text-[12.5px] leading-5 text-slate-600">{item.answer}</p>
            </details>
          ))}
        </div>
      </Panel>
    </div>
  );
}
