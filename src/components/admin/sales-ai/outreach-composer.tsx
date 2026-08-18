"use client";

import { useCallback, useState } from "react";
import { Loader2, PenLine, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Compositor del primer contacto. Redactar y enviar son dos pasos separados a
 * propósito: el correo nunca sale sin que una persona lo haya visto.
 */
export function OutreachComposer({
  companyId,
  companyName,
  companyEmail,
  disabled,
  disabledReason,
}: {
  companyId: string;
  companyName: string;
  companyEmail: string | null;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<"draft" | "send" | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [sent, setSent] = useState(false);

  const generate = useCallback(async () => {
    setBusy("draft");
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/sales-ai/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "draft", companyId }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "No se pudo redactar.");

      setSubject(payload.draft?.subject ?? "");
      setBody(payload.draft?.body ?? "");
      setOpen(true);
      if (!payload.usedAi) {
        setFeedback({
          tone: "ok",
          text: "Mensaje base generado sin consumir presupuesto. Revísalo y ajústalo antes de enviar.",
        });
      }
    } catch (error) {
      setFeedback({ tone: "error", text: (error as Error).message });
    } finally {
      setBusy(null);
    }
  }, [companyId]);

  const send = useCallback(async () => {
    setBusy("send");
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/sales-ai/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", companyId, subject, bodyText: body }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "No se pudo enviar.");

      setSent(true);
      const when = payload.scheduledAt
        ? new Date(payload.scheduledAt).toLocaleString("es-CL", { timeZone: "America/Santiago" })
        : null;
      setFeedback({
        tone: "ok",
        text: when
          ? `Programado para ${companyName}. Sale el ${when}; el envío ocurre desde la cola, de a uno.`
          : `Encolado para ${companyName}. Recibirá su hora en el próximo ciclo.`,
      });
    } catch (error) {
      setFeedback({ tone: "error", text: (error as Error).message });
    } finally {
      setBusy(null);
    }
  }, [companyId, companyName, subject, body]);

  if (disabled) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        {disabledReason ?? "No se puede contactar a esta empresa."}
      </p>
    );
  }

  if (!companyEmail) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Esta empresa no tiene correo registrado, así que no se le puede escribir.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {feedback ? (
        <p
          className={`rounded-xl border p-3 text-sm ${
            feedback.tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.text}
        </p>
      ) : null}

      {!open ? (
        <Button
          onClick={() => void generate()}
          disabled={busy !== null || sent}
          className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800"
        >
          {busy === "draft" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Preparar primer contacto
        </Button>
      ) : null}

      {open && !sent ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <PenLine className="h-3.5 w-3.5" /> Revisa y edita antes de enviar. Para: {companyEmail}
          </p>

          <label className="mt-3 block">
            <span className="text-xs font-semibold text-slate-600">Asunto</span>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-2 block">
            <span className="text-xs font-semibold text-slate-600">Mensaje</span>
            <textarea
              value={body}
              rows={9}
              onChange={(event) => setBody(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={() => void send()}
              disabled={busy !== null || !subject.trim() || !body.trim()}
              className="gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
            >
              {busy === "send" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Aprobar y programar envío
            </Button>
            <Button
              onClick={() => void generate()}
              disabled={busy !== null}
              variant="outline"
              className="gap-2 border-slate-300 font-semibold"
            >
              Regenerar
            </Button>
            <Button
              onClick={() => setOpen(false)}
              disabled={busy !== null}
              variant="outline"
              className="border-slate-300 font-semibold text-slate-600"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
