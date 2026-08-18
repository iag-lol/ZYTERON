"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Send, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type Draft = {
  id: string;
  company_id: string | null;
  subject: string | null;
  body: string;
  confidence: number | null;
  requires_approval: boolean;
  created_at: string;
  companyName: string | null;
  companyEmail: string | null;
};

/** Cola de respuestas preparadas por Zara, pendientes de aprobación humana. */
export function DraftApproval() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { subject: string; body: string }>>({});
  const [feedback, setFeedback] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sales-ai/drafts");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "No se pudieron leer los borradores.");
      setDrafts(payload.drafts ?? []);
    } catch (error) {
      setFeedback({ tone: "error", text: (error as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (draft: Draft, action: "send" | "discard") => {
      setBusy(draft.id);
      setFeedback(null);
      try {
        const edited = edits[draft.id];
        const res = await fetch("/api/admin/sales-ai/drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            draftId: draft.id,
            ...(action === "send" && edited
              ? { subject: edited.subject, body: edited.body }
              : {}),
          }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "La acción falló.");

        setFeedback({
          tone: "ok",
          text:
            action === "discard"
              ? "Borrador descartado."
              : payload.redirected
                ? "Enviado en MODO PRUEBA: llegó al correo de pruebas, no al cliente."
                : "Respuesta enviada al cliente dentro del hilo original.",
        });
        await load();
      } catch (error) {
        setFeedback({ tone: "error", text: (error as Error).message });
      } finally {
        setBusy(null);
      }
    },
    [edits, load],
  );

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando respuestas preparadas…
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold text-slate-900">
          Respuestas preparadas ({drafts.length})
        </h2>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy !== null}>
          Actualizar
        </Button>
      </div>

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

      {drafts.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
          No hay respuestas esperando aprobación.
        </p>
      ) : null}

      {drafts.map((draft) => {
        const edited = edits[draft.id] ?? {
          subject: draft.subject ?? "",
          body: draft.body ?? "",
        };

        return (
          <article key={draft.id} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-slate-900">
                  {draft.companyName ?? "Empresa sin identificar"}
                </h3>
                <p className="text-xs text-slate-500">
                  {draft.companyEmail ?? "sin correo"} ·{" "}
                  {new Date(draft.created_at).toLocaleString("es-CL")}
                </p>
              </div>
              {draft.confidence != null ? (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                  Confianza {Number(draft.confidence).toFixed(2)}
                </span>
              ) : null}
            </div>

            <label className="mt-3 block">
              <span className="text-xs font-semibold text-slate-600">Asunto</span>
              <input
                value={edited.subject}
                onChange={(event) =>
                  setEdits((current) => ({
                    ...current,
                    [draft.id]: { ...edited, subject: event.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <label className="mt-2 block">
              <span className="text-xs font-semibold text-slate-600">
                Mensaje (puedes editarlo antes de enviar)
              </span>
              <textarea
                value={edited.body}
                rows={8}
                onChange={(event) =>
                  setEdits((current) => ({
                    ...current,
                    [draft.id]: { ...edited, body: event.target.value },
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => void act(draft, "send")}
                disabled={busy !== null}
                className="gap-2 bg-emerald-600 font-bold text-white hover:bg-emerald-700"
              >
                {busy === draft.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Aprobar y enviar
              </Button>
              <Button
                onClick={() => void act(draft, "discard")}
                disabled={busy !== null}
                variant="outline"
                className="gap-2 border-slate-300 font-semibold text-slate-600"
              >
                <Trash2 className="h-4 w-4" /> Descartar
              </Button>
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Check className="h-3 w-3" /> La respuesta sale dentro del hilo original.
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
