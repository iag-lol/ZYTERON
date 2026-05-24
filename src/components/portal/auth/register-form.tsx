"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PortalRegisterFormProps = {
  googleEnabled?: boolean;
};

export function PortalRegisterForm({ googleEnabled = false }: PortalRegisterFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    password: "",
    confirmPassword: "",
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit() {
    setError("");
    setSuccess("");
    const response = await fetch("/api/portal/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || "No se pudo completar el registro.");
      return;
    }
    setSuccess("Cuenta creada. Te enviamos un código al correo para verificar tu acceso.");
    router.push(`/portal-clientes/verificar?email=${encodeURIComponent(form.email)}`);
  }

  async function continueWithGoogle() {
    setError("");
    setSuccess("");
    await signIn("google", { callbackUrl: "/portal-clientes/panel" });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(onSubmit);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">Nombre</Label>
          <Input
            id="firstName"
            value={form.firstName}
            onChange={(event) => setField("firstName", event.target.value)}
            placeholder="Tu nombre"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Apellido</Label>
          <Input
            id="lastName"
            value={form.lastName}
            onChange={(event) => setField("lastName", event.target.value)}
            placeholder="Tu apellido"
            required
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(event) => setField("email", event.target.value)}
          placeholder="correo@empresa.cl"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="company">Empresa</Label>
        <Input
          id="company"
          value={form.company}
          onChange={(event) => setField("company", event.target.value)}
          placeholder="Nombre de tu empresa"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            value={form.password}
            onChange={(event) => setField("password", event.target.value)}
            placeholder="Mínimo 8 caracteres"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={(event) => setField("confirmPassword", event.target.value)}
            required
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <Button type="submit" className="h-11 w-full bg-blue-700 font-semibold hover:bg-blue-800" disabled={pending}>
        {pending ? "Creando cuenta..." : "Crear cuenta"}
      </Button>

      {googleEnabled ? (
        <button
          type="button"
          onClick={() => startTransition(continueWithGoogle)}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
        >
          Crear cuenta con Google
        </button>
      ) : null}

      <p className="text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{" "}
        <Link href="/portal-clientes/login" className="font-semibold text-blue-700 hover:text-blue-800">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
