"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PortalForgotPasswordForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  async function onSubmit() {
    setError("");
    setMessage("");
    const response = await fetch("/api/portal/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || "No se pudo procesar la solicitud.");
      return;
    }
    setMessage("Si el correo existe, enviamos un código de recuperación.");
    router.push(`/portal-clientes/restablecer?email=${encodeURIComponent(email)}`);
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(onSubmit);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo de la cuenta</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="correo@empresa.cl"
          required
        />
      </div>

      {error ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      <Button type="submit" className="h-11 w-full bg-blue-700 hover:bg-blue-800" disabled={pending}>
        {pending ? "Enviando..." : "Enviar código de recuperación"}
      </Button>
    </form>
  );
}

