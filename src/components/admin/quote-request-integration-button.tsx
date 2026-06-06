"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2, Mail, MessageCircle, TriangleAlert } from "lucide-react";

type Props = {
  channel: "email" | "whatsapp";
  quoteId: string;
  compact?: boolean;
};

type IntegrationResponse = {
  ok?: boolean;
  error?: string;
};

export function QuoteRequestIntegrationButton({ channel, quoteId, compact = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4200);
    return () => clearTimeout(timer);
  }, [notice]);

  const label = channel === "email" ? "Reenviar correo" : "Reenviar WhatsApp";
  const Icon = channel === "email" ? Mail : MessageCircle;

  const handleClick = () => {
    if (isPending) return;

    startTransition(async () => {
      try {
        const response = await fetch(`/admin/cotizaciones/${quoteId}/integrations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ channel }),
        });
        const payload = (await response.json().catch(() => null)) as IntegrationResponse | null;

        if (!response.ok || !payload?.ok) {
          setNotice({
            type: "error",
            text: payload?.error || `No se pudo ${label.toLowerCase()}.`,
          });
          return;
        }

        setNotice({
          type: "success",
          text: `${label} correctamente.`,
        });
      } catch (error) {
        setNotice({
          type: "error",
          text: error instanceof Error ? error.message : `No se pudo ${label.toLowerCase()}.`,
        });
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          compact
            ? "flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        }
        title={label}
      >
        {isPending ? <Loader2 className={compact ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4 animate-spin"} /> : <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />}
        {compact ? null : label}
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
                {notice.type === "success" ? "Acción completada" : "Error"}
              </p>
              <p className="mt-0.5 text-sm font-semibold">{notice.text}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
