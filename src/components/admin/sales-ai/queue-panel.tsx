"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, PauseCircle, PlayCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type Stats = {
  pendingAnalysis: number;
  pendingReview: number;
  scheduled: number;
  processing: number;
  acceptedToday: number;
  sentWithoutBounce: number;
  bounced: number;
  errors: number;
  nextSendAt: string | null;
  lastBounceCode: string | null;
};

type Upcoming = {
  id: string;
  kind: string;
  subject: string | null;
  scheduled_at: string | null;
  recipient_email: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Estado de la cola de envíos.
 *
 * Distingue "aceptado por Microsoft" de "enviado sin rebote": Graph puede
 * aceptar un mensaje y devolver un NDR después, así que llamarlo enviado antes
 * de tiempo daría una lectura falsa.
 */
export function QueuePanel({
  stats,
  upcoming,
  paused,
  pauseReason,
  dailyLimit,
  warmupStage,
}: {
  stats: Stats;
  upcoming: Upcoming[];
  paused: boolean;
  pauseReason: string | null;
  dailyLimit: number;
  warmupStage: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const act = useCallback(
    async (action: "pause" | "resume" | "reschedule") => {
      if (action === "resume" && !window.confirm(
        "Vas a reactivar los envíos. Si la pausa fue por un bloqueo de entrega, " +
        "confirma antes que SPF, DKIM y DMARC estén configurados. ¿Continuar?",
      )) {
        return;
      }

      setBusy(action);
      setMessage(null);
      try {
        const res = await fetch("/api/admin/sales-ai/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "La acción falló.");
        setMessage(payload.message ?? "Listo.");
        router.refresh();
      } catch (error) {
        setMessage((error as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [router],
  );

  const cards = [
    { label: "Por analizar", value: stats.pendingAnalysis },
    { label: "Esperando revisión", value: stats.pendingReview },
    { label: "Programados", value: stats.scheduled },
    { label: "Enviados hoy", value: stats.acceptedToday },
    { label: "Aceptados por Microsoft", value: stats.sentWithoutBounce },
    { label: "Rebotados", value: stats.bounced },
    { label: "Con error", value: stats.errors },
    { label: "En curso", value: stats.processing },
  ];

  return (
    <section className="space-y-4">
      <div
        className={`rounded-2xl border p-5 ${
          paused ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Cola de envíos · {paused ? "DETENIDA" : "Operando"}
            </h2>
            <p className="mt-1 text-sm text-slate-700">
              Límite actual: <strong>{dailyLimit} correos al día</strong> · {warmupStage}
            </p>
            {paused && pauseReason ? (
              <p className="mt-2 rounded-lg border border-rose-200 bg-white p-2.5 text-xs text-rose-800">
                <span className="font-bold">Motivo de la pausa:</span> {pauseReason}
              </p>
            ) : null}
            {stats.lastBounceCode ? (
              <p className="mt-1 text-xs text-slate-600">
                Último código de rebote: <code>{stats.lastBounceCode}</code>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {paused ? (
              <Button
                onClick={() => void act("resume")}
                disabled={busy !== null}
                className="gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
              >
                {busy === "resume" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                Reactivar
              </Button>
            ) : (
              <Button
                onClick={() => void act("pause")}
                disabled={busy !== null}
                className="gap-2 bg-rose-600 font-bold text-white hover:bg-rose-700"
              >
                {busy === "pause" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                Pausar
              </Button>
            )}
            <Button
              onClick={() => void act("reschedule")}
              disabled={busy !== null}
              variant="outline"
              className="gap-2 border-slate-300 font-semibold"
            >
              {busy === "reschedule" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Reprogramar atrasados
            </Button>
          </div>
        </div>

        {message ? (
          <p className="mt-3 rounded-lg border border-slate-200 bg-white p-2.5 text-sm text-slate-700">
            {message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <CalendarClock className="h-4 w-4" /> Próximos envíos programados
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Próximo: <strong>{formatDateTime(stats.nextSendAt)}</strong> · horario de Santiago
        </p>

        {upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No hay envíos programados.</p>
        ) : (
          <ol className="mt-3 space-y-1.5">
            {upcoming.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-2.5 text-sm"
              >
                <span className="font-mono text-xs font-bold text-blue-700">
                  {formatDateTime(item.scheduled_at)}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-700">
                  {item.subject ?? "(sin asunto)"}
                </span>
                <span className="truncate text-xs text-slate-500">{item.recipient_email}</span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  {item.kind}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
