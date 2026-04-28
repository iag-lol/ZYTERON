"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, ShieldX, Trash2 } from "lucide-react";

type Props = {
  reviewId: string;
  redirectTo: string;
};

type ReviewStatus = "APPROVED" | "PENDING" | "REJECTED";

const buttonClass = "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold";

export function ReviewModerationActions({ reviewId, redirectTo }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function runStatusAction(status: ReviewStatus, successMessage: string) {
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch(`/admin/comentarios/${reviewId}/estado`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status,
            redirectTo,
          }),
        });

        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          setMessage(data?.error || "No se pudo actualizar el comentario.");
          return;
        }

        const connector = redirectTo.includes("?") ? "&" : "?";
        router.replace(`${redirectTo}${connector}saved=1`);
        router.refresh();
        setMessage(successMessage);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No se pudo actualizar el comentario.");
      }
    });
  }

  function runDeleteAction(successMessage: string) {
    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch("/admin/control-web/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            section: "review",
            action: "delete",
            id: reviewId,
          }),
        });

        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          setMessage(data?.error || "No se pudo eliminar el comentario.");
          return;
        }

        const connector = redirectTo.includes("?") ? "&" : "?";
        router.replace(`${redirectTo}${connector}saved=1`);
        router.refresh();
        setMessage(successMessage);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "No se pudo eliminar el comentario.");
      }
    });
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => runStatusAction("APPROVED", "Comentario aprobado.")}
          className={`${buttonClass} border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
          disabled={isPending}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar
        </button>

        <button
          type="button"
          onClick={() => runStatusAction("PENDING", "Comentario en pendiente.")}
          className={`${buttonClass} border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`}
          disabled={isPending}
        >
          <Clock3 className="h-3.5 w-3.5" /> Dejar pendiente
        </button>

        <button
          type="button"
          onClick={() => runStatusAction("REJECTED", "Comentario rechazado.")}
          className={`${buttonClass} border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100`}
          disabled={isPending}
        >
          <ShieldX className="h-3.5 w-3.5" /> Rechazar
        </button>

        <button
          type="button"
          onClick={() => runDeleteAction("Comentario eliminado.")}
          className={`${buttonClass} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}
          disabled={isPending}
        >
          <Trash2 className="h-3.5 w-3.5" /> Eliminar
        </button>
      </div>

      {message ? (
        <p className={`mt-2 text-xs ${message.toLowerCase().includes("no se pudo") ? "text-rose-600" : "text-emerald-700"}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
