import { requirePortalAdminApiSession } from "@/lib/auth/portal-admin-api";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function PaymentOperationsPage() {
  const authorized = await requirePortalAdminApiSession();
  if ("error" in authorized) redirect("/administracion/login");
  const [inbox, mail, attempts, cancellations, creations] = await Promise.all([
    prisma.$queryRaw<
      Array<{ quote_id: string; state: string; attempts: number; created_at: Date }>
    >`SELECT quote_id,state,attempts,created_at FROM zyteron_payment_inbox WHERE state!='DONE' ORDER BY created_at DESC LIMIT 100`,
    prisma.$queryRaw<
      Array<{ quote_id: string; state: string; kind: string; created_at: Date }>
    >`SELECT quote_id,state,kind,created_at FROM zyteron_payment_mail ORDER BY created_at DESC LIMIT 100`,
    prisma.$queryRaw<
      Array<{ quote_id: string; amount: number; flow_order: bigint }>
    >`SELECT quote_id,amount,flow_order FROM zyteron_payment_attempt WHERE review_required ORDER BY created_at DESC LIMIT 100`,
    prisma.$queryRaw<
      Array<{
        quote_id: string;
        state: string;
        paid_through: Date | null;
        maintenance_ack_at: Date | null;
      }>
    >`SELECT quote_id,state,paid_through,maintenance_ack_at FROM zyteron_recurring_lifecycle WHERE state!='ACTIVE' ORDER BY updated_at DESC LIMIT 100`,
    prisma.$queryRaw<
      Array<{ quote_id: string; state: string }>
    >`SELECT quote_id,state FROM zyteron_provider_operation WHERE state='UNKNOWN' OR (state='CREATING' AND created_at<now()-interval '2 minutes') ORDER BY created_at DESC LIMIT 100`,
  ]);
  const reference = (id: string) => (
    <Link
      className="font-semibold underline decoration-emerald-300 underline-offset-4"
      href="/administracion/cotizaciones"
    >
      {id.slice(0, 12)}
    </Link>
  );
  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-emerald-950 p-6 text-white">
        <p className="text-xs tracking-widest text-lime-200">CONTROL FINANCIERO</p>
        <h1 className="mt-2 text-3xl font-bold">Pagos y renovaciones</h1>
        <p className="mt-2 text-sm text-emerald-100">
          Confirmaciones, comprobantes y cancelaciones verificables. Un correo aceptado por el
          proveedor todavía no acredita su entrega.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Creación de cobros en revisión</h2>
          {!creations.length ? (
            <p className="mt-4 text-sm text-slate-500">Sin creaciones ambiguas.</p>
          ) : (
            creations.map((r, i) => (
              <p className="mt-3 border-t pt-3 text-sm" key={i}>
                {reference(r.quote_id)} · Verificación manual requerida
                <span className="block text-slate-500">
                  Consulta la orden en la pasarela antes de autorizar otro intento.
                </span>
              </p>
            ))
          )}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Confirmaciones por conciliar</h2>
          {!inbox.length ? (
            <p className="mt-4 text-sm text-slate-500">Sin confirmaciones pendientes.</p>
          ) : (
            inbox.map((r, i) => (
              <p className="mt-3 border-t pt-3 text-sm" key={i}>
                {reference(r.quote_id)} ·{" "}
                {r.state === "REVIEW_REQUIRED"
                  ? "Revisión manual"
                  : r.state === "PROCESSING"
                    ? "Verificando"
                    : "En espera"}{" "}
                · {r.attempts} intentos
              </p>
            ))
          )}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Pagos de intentos anteriores</h2>
          {!attempts.length ? (
            <p className="mt-4 text-sm text-slate-500">Sin pagos que requieran revisión.</p>
          ) : (
            attempts.map((r, i) => (
              <p className="mt-3 border-t pt-3 text-sm" key={i}>
                {reference(r.quote_id)} · ${r.amount.toLocaleString("es-CL")} · Transacción{" "}
                {String(r.flow_order)}
                <span className="block text-slate-500">
                  Verifica el importe recibido antes de asignarlo o devolverlo.
                </span>
              </p>
            ))
          )}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Comprobantes y avisos</h2>
          {!mail.length ? (
            <p className="mt-4 text-sm text-slate-500">Sin envíos registrados.</p>
          ) : (
            mail.map((r, i) => (
              <p className="mt-3 border-t pt-3 text-sm" key={i}>
                {reference(r.quote_id)} ·{" "}
                {r.kind === "SUBSCRIPTION_CANCELLED" ? "Aviso de cancelación" : "Comprobante"} ·{" "}
                {r.state === "ACCEPTED"
                  ? "Aceptado para envío"
                  : r.state === "REVIEW_REQUIRED"
                    ? "Revisión requerida"
                    : "En proceso"}
              </p>
            ))
          )}
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Cancelaciones</h2>
          {!cancellations.length ? (
            <p className="mt-4 text-sm text-slate-500">Sin cancelaciones registradas.</p>
          ) : (
            cancellations.map((r, i) => (
              <p className="mt-3 border-t pt-3 text-sm" key={i}>
                {reference(r.quote_id)} · {r.state}
                <span className="block text-slate-500">
                  Cobertura:{" "}
                  {r.paid_through
                    ? r.paid_through.toLocaleDateString("es-CL", { timeZone: "America/Santiago" })
                    : "Sin período pagado confirmado"}{" "}
                  · Sitio:{" "}
                  {r.maintenance_ack_at
                    ? "Mantención confirmada"
                    : "Sin confirmación de mantención"}
                </span>
              </p>
            ))
          )}
        </article>
      </div>
    </section>
  );
}
