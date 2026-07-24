"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

type Props = {
  quoteId: string;
  label?: string;
  compact?: boolean;
};

export function QuoteDeleteButton({ quoteId, label, compact = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleClick() {
    setError("");
    const confirmed = window.confirm(
      "¿Eliminar esta cotización de forma permanente? Esta acción no se puede deshacer.",
    );
    if (!confirmed) return;

    startTransition(async () => {
      try {
        const res = await fetch(`/admin/cotizaciones/${quoteId}/eliminar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          setError(data?.error || "No se pudo eliminar la cotización.");
          return;
        }
        router.refresh();
      } catch {
        setError("No se pudo eliminar la cotización.");
      }
    });
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        title={error || "Eliminar cotización"}
        aria-label="Eliminar cotización"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title={error || undefined}
      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      {label || "Eliminar"}
    </button>
  );
}
