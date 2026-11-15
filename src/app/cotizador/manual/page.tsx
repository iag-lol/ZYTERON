import Link from "next/link";
import { Container } from "@/components/layout/container";
import { ManualQuoteBuilder } from "@/components/manual-quote/quote-builder";
import { clp } from "@/config/pricing";
import { CLOSED_PLANS } from "@/lib/manual-quote/catalog";
import { createPageMetadata } from "@/lib/seo";

const startingPlans = CLOSED_PLANS.filter((plan) =>
  ["web-basica", "pyme", "ecommerce"].includes(plan.id),
);
const entryPrice = clp(CLOSED_PLANS.find((plan) => plan.id === "web-basica")!.amount);

export const metadata = createPageMetadata({
  title: "Cotizador de páginas web: planes y precio cerrado",
  description: `Cotiza tu página web desde ${entryPrice} + IVA. Compara planes, revisa entregables y agrega funciones con su precio antes de contratar.`,
  path: "/cotizador/manual",
});
export default async function ManualQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  return (
    <main className="manual-page">
      <Container>
        <header className="manual-page-heading">
          <p className="eyebrow">Cotizador de páginas web y ecommerce</p>
          <h1>Cotiza tu página web con precio y alcance definidos</h1>
          <p>
            Páginas web desde {entryPrice} + IVA. Elige un plan base y las funciones que necesitas;
            revisa el precio total, los entregables y el plazo antes de contratar.
          </p>
        </header>
        <section className="mb-8 space-y-4" aria-labelledby="manual-starting-plans">
          <h2 id="manual-starting-plans" className="text-xl font-semibold">
            Precio y alcance para empezar
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {startingPlans.map((startingPlan) => (
              <li key={startingPlan.id} className="rounded-xl border border-slate-200 p-4">
                <h3 className="font-semibold">{startingPlan.name}</h3>
                <p className="mt-2 text-lg font-semibold">{clp(startingPlan.amount)} + IVA</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {startingPlan.includes[0]}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {startingPlan.days.join(" a ")} días hábiles de desarrollo base.
                </p>
              </li>
            ))}
          </ul>
          <p className="text-sm leading-relaxed text-slate-600">
            Los adicionales amplían el precio y el plazo. El desarrollo comienza con el pago y los
            contenidos y accesos completos. Dominio, hosting y servicios de terceros se contratan
            por separado.
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            Para configurar y guardar una cotización, el siguiente paso solicita tus datos de
            contacto. Si primero quieres una estimación sin registro, usa la calculadora de precio.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <Link href="/calculadora-precio-pagina-web" className="text-link">
              Calcular precio sin registro
            </Link>
            <Link href="/planes#paginas-web" className="text-link">
              Comparar todos los planes
            </Link>
            <Link href="/casos-exito/fenice-spa" className="text-link">
              Ver el proyecto de Fenice
            </Link>
            <Link href="/contacto?origen=cotizador-manual" className="text-link">
              Solicitar orientación
            </Link>
          </div>
        </section>
        <ManualQuoteBuilder initialPlan={plan} />
      </Container>
    </main>
  );
}
