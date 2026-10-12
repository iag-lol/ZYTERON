import Link from "next/link";
import { assertAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { IntakeRequestActions } from "@/components/admin/intake-request-actions";
export const dynamic = "force-dynamic";
export default async function IntakeInbox() {
  await assertAdmin();
  const [leads, quotes, requests, tickets] = await Promise.all([
    prisma.lead.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, name: true, source: true, createdAt: true, message: true },
    }),
    prisma.quote.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, name: true, createdAt: true, total: true },
    }),
    prisma.portalRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true } } },
    }),
    prisma.supportTicket.findMany({
      where: { status: { notIn: ["CLOSED", "RESOLVED"] } },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: { id: true, userId: true, title: true, status: true },
    }),
  ]);
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase">
          SOLICITUDES Y OPORTUNIDADES
        </p>
        <h1 className="mt-2 text-3xl font-bold">Todo lo que llega a Zyteron</h1>
        <p className="mt-2 text-sm text-slate-600">
          Formularios públicos, cotizaciones, solicitudes del portal y asistencia en sus registros
          originales.
        </p>
      </header>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Solicitudes del portal</h2>
          {requests.map((r) => (
            <article className="rounded-2xl border border-slate-200 bg-white p-5" key={r.id}>
              <small className="text-slate-500">
                {r.user.name} · {r.type}
              </small>
              <h3 className="mt-2 font-semibold">{r.title}</h3>
              <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600">{r.details}</p>
              <Link
                className="mt-2 block text-sm text-emerald-800 underline"
                href={`/administracion/portal-clientes/${r.userId}`}
              >
                Ver ficha del cliente
              </Link>
              <IntakeRequestActions id={r.id} status={r.status} />
            </article>
          ))}
          {!requests.length && (
            <p className="text-sm text-slate-500">Sin solicitudes del portal todavía.</p>
          )}
        </section>
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-xl font-semibold">Cotizaciones por preparar</h2>
            {quotes.map((q) => (
              <Link
                key={q.id}
                className="mb-2 block rounded-xl border border-slate-100 p-3"
                href={`/administracion/cotizaciones/${q.id}`}
              >
                <b>{q.name}</b>
                <small className="mt-1 block text-slate-500">
                  Revisión comercial pendiente ·{" "}
                  {q.createdAt.toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}
                </small>
              </Link>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-xl font-semibold">Formularios y contactos</h2>
            {leads.map((l) => (
              <Link
                className="mb-2 block rounded-xl border border-slate-100 p-3"
                key={l.id}
                href="/administracion/contactos"
              >
                <b>{l.name}</b>
                <small className="mt-1 block text-slate-500">
                  {l.source || "Contacto"} ·{" "}
                  {l.createdAt.toLocaleDateString("es-CL", { timeZone: "America/Santiago" })}
                </small>
              </Link>
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-xl font-semibold">Asistencia abierta</h2>
            {tickets.map((t) => (
              <Link
                className="mb-2 block rounded-xl border border-slate-100 p-3"
                key={t.id}
                href={`/administracion/portal-clientes/${t.userId}`}
              >
                <b>{t.title}</b>
                <small className="mt-1 block text-slate-500">{t.status}</small>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
