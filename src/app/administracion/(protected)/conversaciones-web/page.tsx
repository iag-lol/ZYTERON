import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { assertAdmin } from "@/lib/auth/admin";
import { WebChatReply } from "@/components/admin/web-chat-reply";
export const dynamic = "force-dynamic";
export default async function WebConversations({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await assertAdmin();
  const query = await searchParams;
  const threads = await prisma.$queryRaw<
    Array<{
      id: string;
      subject: string;
      legacy_user_id: string | null;
      message_count: number;
      last_message_at: Date;
      lead_id: string | null;
      quote_id: string | null;
    }>
  >`SELECT id,subject,legacy_user_id,message_count,last_message_at,lead_id,quote_id FROM sales_threads WHERE channel='WEB_CHAT' ORDER BY last_message_at DESC NULLS LAST LIMIT 100`;
  const current = threads.find((t) => t.id === query.id) || threads[0];
  const messages = current
    ? await prisma.$queryRaw<
        Array<{
          id: string;
          direction: string;
          actor_kind: string;
          body_text: string;
          created_at: Date;
        }>
      >`SELECT id,direction,actor_kind,body_text,created_at FROM sales_messages WHERE thread_id=${current.id}::uuid ORDER BY created_at LIMIT 200`
    : [];
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase">
          ATENCIÓN Y SEGUIMIENTO
        </p>
        <h1 className="mt-2 text-3xl font-bold">Conversaciones de la web</h1>
        <p className="mt-2 text-sm text-slate-600">
          Historial completo del chat, datos capturados y respuestas de nuestro equipo.
        </p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-4 font-semibold">Bandeja de conversaciones</h2>
          {threads.map((t) => (
            <Link
              key={t.id}
              href={`/administracion/conversaciones-web?id=${t.id}`}
              className={`mb-2 block rounded-xl border p-3 ${t.id === current?.id ? "border-emerald-700 bg-emerald-50" : "border-slate-200"}`}
            >
              <b className="text-sm">{t.subject}</b>
              <small className="mt-1 block text-slate-500">
                {t.message_count} mensajes · {t.legacy_user_id ? "Cliente vinculado" : "Visitante"}
              </small>
            </Link>
          ))}
          {!threads.length && (
            <p className="text-sm text-slate-500">Todavía no hay conversaciones de la web.</p>
          )}
        </aside>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          {current && (
            <>
              <div className="flex flex-wrap gap-3 text-sm">
                {current.legacy_user_id && (
                  <Link
                    className="text-emerald-800 underline"
                    href={`/administracion/portal-clientes/${current.legacy_user_id}`}
                  >
                    Ver cliente
                  </Link>
                )}
                {current.lead_id && (
                  <Link className="text-emerald-800 underline" href="/administracion/contactos">
                    Ver solicitud capturada
                  </Link>
                )}
                {current.quote_id && (
                  <Link
                    className="text-emerald-800 underline"
                    href={`/administracion/cotizaciones/${current.quote_id}`}
                  >
                    Revisar cotización
                  </Link>
                )}
              </div>
              {messages.map((m) => (
                <article
                  key={m.id}
                  className={`rounded-xl p-4 ${m.direction === "INBOUND" ? "bg-slate-50" : "bg-emerald-50"}`}
                >
                  <div className="mb-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                    <b>
                      {m.direction === "INBOUND"
                        ? "Cliente o visitante"
                        : m.actor_kind === "AI"
                          ? "Zara · Asistente IA"
                          : "Equipo Zyteron"}
                    </b>
                    <time>
                      {m.created_at.toLocaleString("es-CL", { timeZone: "America/Santiago" })}
                    </time>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.body_text}</p>
                </article>
              ))}
              <WebChatReply threadId={current.id} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
