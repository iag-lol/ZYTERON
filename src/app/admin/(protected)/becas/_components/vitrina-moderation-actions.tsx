"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle, EyeOff, Trash2 } from "lucide-react";

interface Props {
  profileId: string;
  currentStatus: string;
}

export function VitrinaModerationActions({ profileId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const update = async (status: "published" | "hidden" | "removed") => {
    setLoading(true);
    await fetch(`/api/becas/vitrina/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  };

  return (
    <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
      {currentStatus !== "published" && (
        <button
          disabled={loading}
          onClick={() => update("published")}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          <CheckCircle className="h-3.5 w-3.5" />
          Publicar
        </button>
      )}
      {currentStatus !== "hidden" && (
        <button
          disabled={loading}
          onClick={() => update("hidden")}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          <EyeOff className="h-3.5 w-3.5" />
          Ocultar
        </button>
      )}
      {currentStatus !== "removed" && (
        <button
          disabled={loading}
          onClick={() => update("removed")}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remover
        </button>
      )}
      {loading && (
        <span className="text-xs text-slate-400 animate-pulse">Guardando…</span>
      )}
    </div>
  );
}
