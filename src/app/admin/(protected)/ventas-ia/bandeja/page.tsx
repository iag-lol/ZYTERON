import { Inbox, Plug } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSalesSettings } from "@/lib/sales-ai/settings";
import { DraftApproval } from "@/components/admin/sales-ai/draft-approval";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bandeja comercial" };

type MessageRow = {
  id: string;
  company_id: string | null;
  subject: string | null;
  from_email: string | null;
  from_name: string | null;
  body_preview: string | null;
  sent_at: string | null;
  ai_analyzed: boolean;
  ai_intent: string | null;
  ai_confidence: number | null;
  ai_summary: string | null;
  ai_recommended_action: string | null;
  ai_requires_human: boolean | null;
};

export default async function BandejaIaPage() {
  const settings = await getSalesSettings();

  let messages: MessageRow[] = [];
  let mailConnected = false;
  let ready = true;

  try {
    const { supabase } = createSupabaseServerClient();

    const { data: account } = await supabase
      .from("sales_mail_account")
      .select("user_principal_name, connected_at, last_error")
      .eq("id", "default")
      .maybeSingle();
    mailConnected = Boolean(account?.connected_at);

    const { data } = await supabase
      .from("sales_messages")
      .select("*")
      .eq("direction", "INBOUND")
      .order("sent_at", { ascending: false })
      .limit(100);
    messages = (data ?? []) as MessageRow[];
  } catch {
    ready = false;
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <Inbox className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Bandeja comercial</h1>
          <p className="mt-1 text-sm text-slate-600">
            Correos recibidos de prospectos, con el análisis de Zara y la acción recomendada.
          </p>
        </div>
      </header>

      <DraftApproval />

      {!ready ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Ejecuta <code>supabase/sales_ai_zara.sql</code> para habilitar la bandeja.
        </div>
      ) : null}

      {ready && !mailConnected ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <Plug className="mx-auto h-9 w-9 text-slate-400" />
          <h2 className="mt-3 text-base font-bold text-slate-900">Correo no conectado</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            La bandeja se llena cuando se conecta la cuenta de Microsoft 365. Esa conexión necesita
            credenciales de Azure que debe generar el administrador; están documentadas en
            <code className="mx-1">docs/zara-ventas-ia.md</code>.
          </p>
          <p className="mx-auto mt-2 max-w-xl text-xs text-slate-500">
            Mientras tanto, el CRM, la importación de prospectos y el historial funcionan con
            normalidad.
          </p>
        </div>
      ) : null}

      {messages.length === 0 && ready && mailConnected ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          No hay correos recibidos todavía.
        </div>
      ) : null}

      {messages.length > 0 ? (
        <div className="space-y-3">
          {messages.map((message) => (
            <article key={message.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-extrabold text-slate-900">
                    {message.subject || "(sin asunto)"}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {message.from_name || message.from_email} ·{" "}
                    {message.sent_at ? new Date(message.sent_at).toLocaleString("es-CL") : "—"}
                  </p>
                </div>
                {message.ai_confidence != null ? (
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                      message.ai_requires_human
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    Confianza {Number(message.ai_confidence).toFixed(2)}
                    {message.ai_requires_human ? " · requiere revisión" : ""}
                  </span>
                ) : (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    Sin analizar
                  </span>
                )}
              </div>

              {message.ai_summary ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="font-semibold">Resumen de Zara:</span> {message.ai_summary}
                </p>
              ) : (
                <p className="mt-3 text-sm text-slate-600">{message.body_preview}</p>
              )}

              {message.ai_recommended_action ? (
                <p className="mt-2 text-xs text-slate-600">
                  <span className="font-semibold">Acción recomendada:</span>{" "}
                  {message.ai_recommended_action}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {settings.zara_paused ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Zara está pausada: se siguen recibiendo y guardando correos, pero no se envía ninguna
          respuesta automática.
        </p>
      ) : null}
    </div>
  );
}
