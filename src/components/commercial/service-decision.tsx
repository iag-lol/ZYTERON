import Link from "next/link";
import { Container } from "@/components/layout/container";
import { PLAN_CATALOG, type PlanId } from "@/config/pricing";
import { OFFER_CONDITIONS } from "@/config/commercial-offer";
import { planContactHref, serviceLineFor } from "@/lib/commercial/request-context";

export function ServiceDecision({ path }: { path: string }) {
  const systems = serviceLineFor(path) === "sistemas_automatizacion";
  const store = path.includes("tienda");
  const ids: PlanId[] = systems
    ? ["sistema", "avanzado"]
    : store
      ? ["catalogo", "ecommerce"]
      : ["web-basica", "pyme", "empresa"];
  const plans = ids.map((id) => PLAN_CATALOG.find((p) => p.id === id)!);
  return (
    <section
      className="border-y border-slate-200 bg-slate-50 py-14"
      aria-labelledby="service-decision-title"
    >
      <Container>
        <p className="text-xs font-bold tracking-widest text-blue-700 uppercase">
          Alcance e inversión
        </p>
        <h2
          id="service-decision-title"
          className="mt-3 text-3xl font-bold tracking-tight text-slate-950"
        >
          {systems
            ? "Empieza por el proceso que necesita orden"
            : store
              ? "Elige cómo vas a recibir y cobrar pedidos"
              : "Una web acorde a tu objetivo comercial"}
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          {systems
            ? "En el diagnóstico revisamos el proceso actual, usuarios, roles, datos, integraciones y migración. La propuesta distingue diagnóstico, desarrollo por etapas, infraestructura y operación; cada partida y su precio se confirman por escrito."
            : store
              ? "El catálogo permite preparar una consulta y coordinar pago y despacho por WhatsApp. El ecommerce incorpora carrito y cobro mediante una pasarela, sujeto a contratación, comisiones y aprobación del proveedor."
              : "Define si necesitas presentar servicios, captar cotizaciones o administrar contenidos. La cantidad de páginas, carga inicial y rondas de revisión quedan detalladas en la propuesta."}
        </p>
        <div
          className={`mt-8 grid gap-5 ${plans.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}
        >
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h3 className="text-lg font-bold text-slate-950">{plan.name}</h3>
              <p className="mt-2 text-xl font-bold text-blue-800">{plan.price}</p>
              <p className="mt-1 text-xs text-slate-500">Implementación · CLP · IVA no incluido</p>
              <p className="mt-4 text-sm leading-6 text-slate-600">{plan.summary}</p>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
                {plan.features.slice(0, 5).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <p className="mt-4 mb-5 text-sm font-semibold text-slate-700">
                Plazo: {plan.deadline}.
              </p>
              <Link
                href={planContactHref(plan.id, path.slice(1))}
                className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-800"
              >
                {systems ? "Solicitar diagnóstico" : plan.cta}
              </Link>
            </article>
          ))}
        </div>
        <div className="mt-6 grid gap-5 text-sm leading-6 text-slate-600 md:grid-cols-3">
          <p>
            <strong className="text-slate-900">Costes recurrentes. </strong>
            {OFFER_CONDITIONS.recurring}
          </p>
          <p>
            <strong className="text-slate-900">Calendario y revisiones. </strong>
            {OFFER_CONDITIONS.delivery}
          </p>
          <p>
            <strong className="text-slate-900">Entrega y continuidad. </strong>
            {OFFER_CONDITIONS.ownership}{" "}
            <Link href="/terminos" className="font-semibold text-blue-700 underline">
              Condiciones de servicio
            </Link>
            .
          </p>
        </div>
        <p className="mt-6 text-sm">
          <Link
            href={
              systems
                ? "/casos-exito/casos-exito-sistema-control-interno-negocios-eliana"
                : store
                  ? "/demos"
                  : "/casos-exito/fenice-spa"
            }
            className="font-bold text-blue-700 underline"
          >
            {systems
              ? "Ver cómo Negocios Eliana centralizó dos tiendas"
              : store
                ? "Explorar una demostración de tienda"
                : "Ver el sitio corporativo de Fenice"}
          </Link>
        </p>
      </Container>
    </section>
  );
}
