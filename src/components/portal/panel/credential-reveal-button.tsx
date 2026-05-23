"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

export function CredentialRevealButton({ credentialId }: { credentialId: string }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function reveal() {
    setError("");
    const response = await fetch(`/api/portal/credentials/${credentialId}/reveal`, {
      method: "GET",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || "No se pudo mostrar la credencial.");
      return;
    }
    setValue(payload.secret || "");
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" className="h-8 text-xs" disabled={pending} onClick={() => startTransition(reveal)}>
        {pending ? "Mostrando..." : value ? "Actualizar valor" : "Mostrar secreto"}
      </Button>
      {value ? <p className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700">{value}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

