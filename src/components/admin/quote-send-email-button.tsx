"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Mail, TriangleAlert } from "lucide-react";

type Props = {
  quoteId: string;
  hasEmail: boolean;
  compact?: boolean;
};

type SendResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  emailId?: string;
  emailEvent?: string | null;
};

export function QuoteSendEmailButton({ quoteId, hasEmail, compact = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(timer);
  }, [notice]);

  const sendEmail = () => {
    if (!hasEmail || isPending) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/admin/cotizaciones/${quoteId}/enviar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mode: "json" }),
        });
        const payload = (await response.json().catch(() => null)) as SendResponse | null;

        if (!response.ok || !payload?.ok) {
          setNotice({
            type: "error",
            text: payload?.error || "No se pudo enviar el correo.",
          });
          return;
        }

        const eventText = payload.emailEvent ? ` · estado: ${payload.emailEvent}` : "";
        setNotice({
          type: "success",
          text: `MENSAJE ENVIADO${eventText}`,
        });
      } catch (error) {
        setNotice({
          type: "error",
          text: error instanceof Error ? error.message : "No se pudo enviar el correo.",
        });
      }
    });
  };

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={sendEmail}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
          title="Enviar email con cotización adjunta"
          disabled={!hasEmail || isPending}
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
        </button>

        {notice ? (
          <div
            className={`fixed bottom-5 right-5 z-[70] min-w-[280px] max-w-[360px] rounded-xl border px-4 py-3 text-sm shadow-xl ${
              notice.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <div className="flex items-start gap-2">
              {notice.type === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest">
                  {notice.type === "success" ? "Envío confirmado" : "Error de envío"}
                </p>
                <p className="mt-0.5 text-sm font-semibold">{notice.text}</p>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={sendEmail}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!hasEmail || isPending}
      >
        <Mail className="h-4 w-4" />
        {isPending ? "Enviando..." : "Enviar"}
      </button>

      {notice ? (
        <div
          className={`fixed bottom-5 right-5 z-[70] min-w-[280px] max-w-[360px] rounded-xl border px-4 py-3 text-sm shadow-xl ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <div className="flex items-start gap-2">
            {notice.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest">
                {notice.type === "success" ? "Envío confirmado" : "Error de envío"}
              </p>
              <p className="mt-0.5 text-sm font-semibold">{notice.text}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
