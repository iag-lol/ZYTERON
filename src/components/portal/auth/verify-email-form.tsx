"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PortalVerifyEmailForm() {
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [resending, startResend] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    email: params.get("email") || "",
    code: "",
    password: "",
  });

  async function verifyCode() {
    setError("");
    setMessage("");
    const response = await fetch("/api/portal/auth/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, code: form.code }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || "No se pudo verificar el código.");
      return;
    }
    setMessage("Correo verificado correctamente. Ya puedes iniciar sesión.");
  }

  async function resendCode() {
    setError("");
    setMessage("");
    const response = await fetch("/api/portal/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || "No se pudo reenviar el código.");
      return;
    }
    setMessage("Código reenviado. Revisa tu bandeja de entrada.");
  }

  async function loginAfterVerify() {
    if (!form.password) {
      setError("Ingresa tu contraseña para iniciar sesión.");
      return;
    }
    setError("");
    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: true,
      callbackUrl: "/portal-clientes/panel",
    });
    if (result?.error) {
      setError("No se pudo iniciar sesión con las credenciales ingresadas.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="code">Código de verificación</Label>
        <Input
          id="code"
          value={form.code}
          onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))}
          placeholder="123456"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña (para ingreso inmediato)</Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          placeholder="Tu contraseña de registro"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          className="h-11 bg-blue-700 font-semibold hover:bg-blue-800"
          onClick={() => startTransition(verifyCode)}
          disabled={pending}
        >
          {pending ? "Validando..." : "Validar código"}
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => startResend(resendCode)} disabled={resending}>
          {resending ? "Reenviando..." : "Reenviar código"}
        </Button>
      </div>

      <Button type="button" variant="secondary" className="h-11 w-full" onClick={() => startTransition(loginAfterVerify)}>
        Iniciar sesión después de verificar
      </Button>
    </div>
  );
}

