"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PortalLoginFormProps = {
  googleEnabled?: boolean;
  initialError?: string;
};
export function PortalLoginForm({ googleEnabled = false, initialError = "" }: PortalLoginFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(initialError);
  const [form, setForm] = useState({ email: "", password: "" });

  async function loginWithCredentials() {
    setError("");
    const pre = await fetch("/api/portal/auth/prelogin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!pre.ok) {
      const payload = await pre.json().catch(() => ({}));
      setError(payload?.error || "No se pudo validar el acceso.");
      return;
    }

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setError("No fue posible iniciar sesión. Intenta nuevamente.");
      return;
    }
    router.push("/portal-clientes/panel");
    router.refresh();
  }

  async function loginWithGoogle() {
    setError("");
    await signIn("google", { callbackUrl: "/portal-clientes/panel" });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(loginWithCredentials);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="correo@empresa.cl"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          required
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full bg-blue-700 font-semibold hover:bg-blue-800" disabled={pending}>
        {pending ? "Ingresando..." : "Ingresar al portal"}
      </Button>

      {googleEnabled ? (
        <button
          type="button"
          onClick={() => startTransition(loginWithGoogle)}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Continuar con Google
        </button>
      ) : null}

      <div className="flex items-center justify-between text-sm">
        <Link href="/portal-clientes/recuperar" className="font-medium text-blue-700 hover:text-blue-800">
          Recuperar contraseña
        </Link>
        <Link href="/portal-clientes/registro" className="font-medium text-slate-600 hover:text-slate-800">
          Crear cuenta
        </Link>
      </div>
    </form>
  );
}
